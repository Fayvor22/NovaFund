import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  UnprocessableEntityException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TransactionBuilder,
  Keypair,
  Networks,
  Horizon,
  Transaction,
  FeeBumpTransaction,
} from '@stellar/stellar-sdk';
import { AccountingService } from '../stellar/accounting.service';

/**
 * Whitelisted Stellar operation types the relay will sponsor.
 * Add/remove here to change what the treasury covers.
 */
const RELAY_WHITELISTED_OPS: ReadonlySet<string> = new Set([
  'invokeHostFunction', // Soroban contract calls
  'payment',           // Refund / transfer flows
  'createAccount',     // New-user onboarding
]);

/** Maximum number of operations per sponsored transaction. */
const MAX_OPS_PER_TX = 10;

/**
 * Maximum fee (in stroops) the relay will pay for a single transaction.
 * Default: 500 000 stroops (0.05 XLM). Override via RELAY_MAX_FEE_STROOPS.
 */
const DEFAULT_MAX_RELAY_FEE = 500_000;

/**
 * Gasless Fee-Bump Relay Service
 *
 * Accepts a user-signed inner transaction (XDR), validates it, wraps it in a
 * FeeBumpTransaction funded by the platform treasury keypair, and submits it
 * to the Stellar network — so users can transact with 0 XLM balance.
 *
 * Security layers:
 *   1. Inner-tx signature verification (Stellar SDK enforces envelope integrity)
 *   2. Operation-type whitelist (only approved op types are sponsored)
 *   3. Fee cap (treasury will never pay more than RELAY_MAX_FEE_STROOPS per tx)
 *   4. FeeBump-of-FeeBump guard (prevents double-wrap attacks)
 *   5. Max-ops guard (prevents gas-griefing via mega transactions)
 *   6. Rate limiting is applied at the controller layer via FeeBumpThrottlerGuard
 */
@Injectable()
export class RelayService {
  private readonly logger = new Logger(RelayService.name);

  /** Treasury (sponsor) keypair — the only secret this service holds. */
  private readonly sponsorKeypair: Keypair;
  private readonly server: Horizon.Server;
  private readonly networkPassphrase: string;

  /**
   * Hard ceiling on the fee the treasury will pay per transaction (stroops).
   * Configured via RELAY_MAX_FEE_STROOPS; defaults to DEFAULT_MAX_RELAY_FEE.
   */
  private readonly maxRelayFee: number;

  constructor(
    private readonly config: ConfigService,
    private readonly accountingService: AccountingService,
  ) {
    // ------------------------------------------------------------------ //
    //  KEY ISOLATION — only place the treasury secret is ever loaded      //
    // ------------------------------------------------------------------ //
    const stellarConfig = this.config.get('stellar');

    if (!stellarConfig?.sponsorSecretKey) {
      throw new Error(
        'STELLAR_SPONSOR_SECRET_KEY is not configured. Refusing to start RelayService.',
      );
    }

    try {
      this.sponsorKeypair = Keypair.fromSecret(stellarConfig.sponsorSecretKey);
    } catch {
      throw new Error(
        'STELLAR_SPONSOR_SECRET_KEY is not a valid Stellar secret key. Refusing to start.',
      );
    }

    this.server = new Horizon.Server(stellarConfig.horizonUrl);
    this.networkPassphrase = stellarConfig.networkPassphrase ?? Networks.TESTNET;
    this.maxRelayFee = this.config.get<number>('RELAY_MAX_FEE_STROOPS', DEFAULT_MAX_RELAY_FEE);

    this.logger.log(
      `RelayService ready | sponsor=${this.sponsorKeypair.publicKey()} | ` +
        `maxFee=${this.maxRelayFee} stroops`,
    );
  }

  /** Returns the sponsor's public key (safe to expose). */
  get sponsorPublicKey(): string {
    return this.sponsorKeypair.publicKey();
  }

  /**
   * Validates, wraps, signs, and submits a gasless FeeBump transaction.
   *
   * @param xdr  Base-64 XDR of the user-signed inner transaction envelope.
   * @returns    The submitted transaction hash and ledger sequence.
   *
   * Flow:
   *   1. Decode + validate inner transaction
   *   2. Operation whitelist check
   *   3. Fee cap enforcement
   *   4. Build & sign FeeBump envelope
   *   5. Submit to Horizon with structured error logging
   */
  async relayTransaction(xdr: string): Promise<{ hash: string; ledger: number }> {
    // ── 1. Decode inner transaction ──────────────────────────────────────
    let innerTx: Transaction;
    try {
      const decoded = TransactionBuilder.fromXDR(xdr, this.networkPassphrase);

      // Guard: reject FeeBump-of-FeeBump attempts
      if (decoded instanceof FeeBumpTransaction) {
        throw new BadRequestException(
          'The submitted XDR is already a FeeBump transaction. Only regular transactions may be relayed.',
        );
      }

      innerTx = decoded as Transaction;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(
        'Could not decode transaction XDR. Ensure it is a valid base-64 TransactionEnvelope.',
      );
    }

    // Verify the inner tx carries at least one signature (user signed it)
    if (!innerTx.signatures || innerTx.signatures.length === 0) {
      throw new UnprocessableEntityException(
        'Inner transaction has no signatures. The user must sign the transaction before relaying.',
      );
    }

    // ── 2. Operation whitelist check ─────────────────────────────────────
    const ops = innerTx.operations;

    if (ops.length === 0) {
      throw new UnprocessableEntityException('Transaction contains no operations.');
    }

    if (ops.length > MAX_OPS_PER_TX) {
      throw new UnprocessableEntityException(
        `Transaction contains too many operations (${ops.length} > ${MAX_OPS_PER_TX}). ` +
          'Split into smaller transactions.',
      );
    }

    for (const op of ops) {
      if (!RELAY_WHITELISTED_OPS.has(op.type)) {
        throw new UnprocessableEntityException(
          `Operation type '${op.type}' is not eligible for gasless relay. ` +
            `Allowed types: ${[...RELAY_WHITELISTED_OPS].join(', ')}.`,
        );
      }
    }

    // ── 3. Build FeeBump + enforce fee cap ───────────────────────────────
    // outer_fee >= inner_fee + (inner_ops + 1) * base_fee  [Stellar protocol rule]
    // We also enforce our own treasury ceiling on top.
    const networkBaseFee = await this.server.fetchBaseFee();
    const innerFee = parseInt(innerTx.fee, 10);
    const requiredOuterFee = innerFee + networkBaseFee * (ops.length + 1);

    if (requiredOuterFee > this.maxRelayFee) {
      throw new UnprocessableEntityException(
        `Required fee (${requiredOuterFee} stroops) exceeds the relay ceiling ` +
          `(${this.maxRelayFee} stroops). Reduce transaction complexity or fee.`,
      );
    }

    let feeBumpTx: FeeBumpTransaction;
    try {
      feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
        this.sponsorKeypair,
        requiredOuterFee.toString(),
        innerTx,
        this.networkPassphrase,
      );
    } catch (err) {
      this.logger.error('Failed to build FeeBump envelope', err);
      throw new InternalServerErrorException(
        'Failed to construct the FeeBump transaction. Please try again.',
      );
    }

    // ── 4. Sign with treasury keypair ────────────────────────────────────
    feeBumpTx.sign(this.sponsorKeypair);

    // ── 5. Submit to Horizon ─────────────────────────────────────────────
    const innerTxHash = innerTx.hash().toString('hex');
    this.logger.log(
      `Submitting fee-bumped tx | innerHash=${innerTxHash} | ` +
        `source=${innerTx.source} | fee=${requiredOuterFee}`,
    );

    try {
      const response = await this.server.submitTransaction(feeBumpTx);

      await this.accountingService.recordHorizonFee('relay.submitTransaction', {
        fee_charged: (response as any).fee_charged,
        hash: response.hash,
        ledger: response.ledger,
      });

      this.logger.log(`Relay success | hash=${response.hash} | ledger=${response.ledger}`);
      return { hash: response.hash, ledger: response.ledger };
    } catch (err: any) {
      const resultCodes = err?.response?.data?.extras?.result_codes;
      this.logger.error(
        `Relay submission failed | innerHash=${innerTxHash} | error=${err.message}`,
        resultCodes ? `result_codes=${JSON.stringify(resultCodes)}` : err.stack,
      );

      // Propagate Horizon result codes to the caller for debugging
      const detail = resultCodes
        ? ` Horizon result codes: ${JSON.stringify(resultCodes)}`
        : ` ${err.message}`;

      throw new ServiceUnavailableException(
        `Failed to submit relayed transaction.${detail}`,
      );
    }
  }
}