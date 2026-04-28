import { Injectable, Logger } from '@nestjs/common';
import { SorobanRpc, TransactionBuilder, Server, Keypair, Networks, Contract } from '@stellar/stellar-sdk';
import { PrismaService } from '../prisma.service';
import { SimulatorService } from './simulator.service';

@Injectable()
export class KillSwitchService {
  private readonly logger = new Logger(KillSwitchService.name);
  private server = new Server('https://soroban-testnet.stellar.org');
  private rpc = new SorobanRpc.Server('https://soroban-testnet.stellar.org');

  constructor(
    private prisma: PrismaService,
    private simulator: SimulatorService,
  ) {}

  async pauseAllContracts(adminKeypair: Keypair): Promise<void> {
    try {
      this.logger.log('Initiating emergency pause for all core contracts');

      const contracts = await this.prisma.contract.findMany({
        where: { isCore: true }
      });

      const account = await this.server.getAccount(adminKeypair.publicKey());

      for (const contract of contracts) {
        await this.pauseContract(contract.id, account, adminKeypair);
      }

      this.logger.log('Emergency pause completed for all core contracts');
    } catch (error) {
      this.logger.error('Failed to pause contracts', error);
      throw error;
    }
  }

  private async pauseContract(contractId: string, account: any, keypair: Keypair): Promise<void> {
    try {
      const contract = new Contract(contractId);

      // Assume pause function exists
      const tx = new TransactionBuilder(account, {
        fee: '1000',
        networkPassphrase: Networks.TESTNET,
      })
      .addOperation(contract.call('pause'))
      .setTimeout(30)
      .build();

      tx.sign(keypair);

      // Simulate first using the unified SimulatorService
      const simResult = await this.simulator.simulate(tx.toXDR());
      if (!simResult.success) {
        throw new Error(`Simulation failed for contract ${contractId}: ${simResult.error}`);
      }

      // Update fee if needed (simulation returns minResourceFee)
      // For emergency pause, we might want to stick to a high fee or use simulation result
      this.logger.debug(`Simulation for ${contractId} successful. Min fee: ${simResult.minResourceFee}`);

      // Submit
      const result = await this.rpc.sendTransaction(tx);
      this.logger.log(`Pause transaction submitted for contract ${contractId}: ${result.hash}`);
    } catch (error) {
      this.logger.error(`Failed to pause contract ${contractId}`, error);
      throw error;
    }
  }
}