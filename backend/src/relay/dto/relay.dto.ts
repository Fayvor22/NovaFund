import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class RelayTransactionDto {
  @IsString()
  @IsNotEmpty()
  xdr: string;

  @IsString()
  @IsOptional()
  network?: string;

  /**
     * Optional: the Stellar public key (G…) of the transaction's source account.
     * Providing this enables per-wallet rate limiting on top of per-IP limits,
     * which prevents treasury drainage even when an attacker rotates IPs.
     */
    @IsString()
    @IsOptional()
    @Matches(/^G[A-Z2-7]{55}$/, {
      message: 'sourceAccount must be a valid Stellar public key (G…)',
    })
    sourceAccount?: string;
}
