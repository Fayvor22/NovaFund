// transaction-handler.ts

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Logger,
} from '@nestjs/common';
import { Transaction, Networks } from '@stellar/stellar-sdk';
import { TransactionService } from './transaction.service';
import { SimulatorService } from './simulator.service';

@Controller('transactions')
export class TransactionHandler {
  private readonly logger = new Logger(TransactionHandler.name);

  constructor(
    private readonly txService: TransactionService,
    private readonly simulator: SimulatorService,
  ) {}

  /**
   * STEP 1: Create transaction (Optimistic Response)
   */
  @Post()
  async createTransaction(@Body() body: { userId: string; xdr: string }) {
    const tx = this.txService.createTransaction(body.userId, body.xdr);

    return {
      transactionId: tx.id,
      status: tx.status,
      message: 'Transaction created. Please sign with your wallet.',
    };
  }

  /**
   * STEP 2: Submit signed transaction
   */
  @Post(':id/sign')
  async submitSignedTransaction(
    @Param('id') id: string,
    @Body() body: { signedXdr: string },
  ) {
    const existingTx = this.txService.getTransaction(id);
    if (!existingTx) {
      return { error: 'Transaction not found' };
    }

    this.logger.log(`Simulating transaction ${id} before submission`);

    // STEP 2a: Simulate Transaction
    const simResult = await this.simulator.simulate(body.signedXdr);

    if (!simResult.success) {
      this.logger.warn(`Transaction ${id} failed simulation: ${simResult.error}`);
      
      this.txService.updateTransaction(id, {
        status: 'FAILED',
        signedXdr: body.signedXdr,
        error: simResult.error,
      });

      return {
        status: 'FAILED',
        error: simResult.error,
        message: 'Transaction simulation failed. It has not been submitted to the network.',
      };
    }

    // STEP 2b: Verify Fee Sufficiency
    // We assume TESTNET as per existing patterns.
    const parsedTx = new Transaction(body.signedXdr, Networks.TESTNET);
    const providedFee = BigInt(parsedTx.fee);
    const requiredFee = BigInt(simResult.minResourceFee || '0');

    if (providedFee < requiredFee) {
      const feeError = `Insufficient fee. Provided: ${providedFee}, Required: ${requiredFee}`;
      this.logger.warn(`Transaction ${id} has insufficient fee: ${feeError}`);

      this.txService.updateTransaction(id, {
        status: 'FAILED',
        signedXdr: body.signedXdr,
        error: feeError,
      });

      return {
        status: 'FAILED',
        error: feeError,
        requiredFee: requiredFee.toString(),
        message: 'Transaction fee is too low according to simulation. Please re-sign with the required fee.',
      };
    }

    // STEP 2c: Update with simulation results and submit
    const tx = this.txService.updateTransaction(id, {
      status: 'SIGNED',
      signedXdr: body.signedXdr,
      fee: simResult.minResourceFee,
      simulationResults: simResult,
    });

    this.logger.log(`Transaction ${id} passed simulation. Fee: ${simResult.minResourceFee}. Submitting...`);

    // Simulate async blockchain submission (or integrate with actual submission here)
    setTimeout(() => {
      this.txService.updateTransaction(id, {
        status: 'CONFIRMED',
      });
    }, 5000);

    return {
      status: 'SUBMITTED',
      fee: simResult.minResourceFee,
      message: 'Transaction simulation successful and submitted to network',
    };
  }

  /**
   * STEP 3: Long Polling Endpoint
   */
  @Get(':id/status')
  async getStatus(
    @Param('id') id: string,
    @Query('wait') wait = 'false',
  ) {
    const shouldWait = wait === 'true';

    if (!shouldWait) {
      return this.txService.getTransaction(id);
    }

    return this.waitForStatusChange(id, 30000); // 30s max wait
  }

  /**
   * Long polling implementation
   */
  private async waitForStatusChange(id: string, timeout: number) {
    const start = Date.now();

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const tx = this.txService.getTransaction(id);

        if (!tx) {
          clearInterval(interval);
          return resolve({ error: 'Transaction not found' });
        }

        if (tx.status === 'CONFIRMED' || tx.status === 'FAILED') {
          clearInterval(interval);
          return resolve(tx);
        }

        if (Date.now() - start > timeout) {
          clearInterval(interval);
          return resolve(tx); // return current state
        }
      }, 1000);
    });
  }
}