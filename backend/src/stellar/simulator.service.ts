import { Injectable, Logger } from '@nestjs/common';
import { SorobanRpc, Transaction, Networks } from '@stellar/stellar-sdk';
import { RpcFallbackService } from './rpc-fallback.service';
import { SimulationResult } from './transaction.types';

@Injectable()
export class SimulatorService {
  private readonly logger = new Logger(SimulatorService.name);

  constructor(private readonly rpcFallback: RpcFallbackService) {}

  /**
   * Simulates a transaction using Soroban RPC.
   * This helps in identifying logic errors and resource usage before submission.
   */
  async simulate(xdr: string): Promise<SimulationResult> {
    try {
      this.logger.debug('Starting transaction simulation');
      
      const server = await this.rpcFallback.getRpcServer();
      
      // We assume TESTNET for now, as seen in other services. 
      // In a production environment, this should be configurable.
      const tx = new Transaction(xdr, Networks.TESTNET);

      const response = await server.simulateTransaction(tx);

      if ('error' in response && response.error) {
        this.logger.warn(`Simulation failed with logic error: ${response.error}`);
        return {
          success: false,
          error: response.error,
        };
      }

      // Casting to any to access properties safely across different sdk versions if needed
      const result = response as any;

      this.logger.log(`Simulation successful. Min fee: ${result.minResourceFee}`);

      return {
        success: true,
        minResourceFee: result.minResourceFee,
        results: result.results,
        events: result.events,
      };
    } catch (error) {
      this.logger.error(`Simulation failed unexpectedly: ${error.message}`);
      return {
        success: false,
        error: `Unexpected simulation error: ${error.message}`,
      };
    }
  }
}
