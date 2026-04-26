import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker } from 'worker_threads';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * ParserService handles offloading XDR decoding to background worker threads.
 * This ensures that heavy parsing of large Soroban ledger chunks or event batches
 * does not block the main event loop and maintains a low memory floor.
 */
@Injectable()
export class ParserService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ParserService.name);
  private worker: Worker | null = null;
  private readonly pendingRequests = new Map<string, { resolve: Function, reject: Function }>();

  async onModuleInit() {
    this.initializeWorker();
  }

  onModuleDestroy() {
    this.terminateWorker();
  }

  private initializeWorker() {
    // The worker file will be compiled to .js in the dist folder
    // We target the .js file relative to the current file's location in dist
    const workerPath = path.resolve(__dirname, 'parser.worker.js');
    
    this.logger.log(`Initializing XDR Parser Worker at: ${workerPath}`);

    try {
      this.worker = new Worker(workerPath);
      
      this.worker.on('message', (response) => {
        const { id, type, payload } = response;
        const request = this.pendingRequests.get(id);
        
        if (request) {
          if (type === 'success') {
            request.resolve(payload);
          } else {
            request.reject(new Error(payload));
          }
          this.pendingRequests.delete(id);
        }
      });

      this.worker.on('error', (error) => {
        this.logger.error(`Parser Worker encountered an error: ${error.message}`);
        this.handleWorkerFailure();
      });

      this.worker.on('exit', (code) => {
        if (code !== 0) {
          this.logger.warn(`Parser Worker exited with code ${code}`);
          this.worker = null;
        }
      });
    } catch (error) {
      this.logger.error(`Failed to spawn Parser Worker: ${error.message}. Falling back to main-thread parsing.`);
      this.worker = null;
    }
  }

  private handleWorkerFailure() {
    this.terminateWorker();
    // Exponential backoff or simple delay could be added here
    setTimeout(() => this.initializeWorker(), 5000);
  }

  private terminateWorker() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    // Reject all pending requests
    for (const [id, request] of this.pendingRequests) {
      request.reject(new Error('Parser Worker terminated'));
      this.pendingRequests.delete(id);
    }
  }

  /**
   * Parse a single ScVal XDR string in the background
   */
  async parseScVal(xdrString: string): Promise<any> {
    if (!this.worker) {
      // Fallback logic if worker is not available
      return this.fallbackParse(xdrString);
    }
    return this.sendToWorker('parse-scval', xdrString);
  }

  /**
   * Parse a batch of XDR strings in the background
   */
  async parseBatch(xdrs: string[]): Promise<any[]> {
    if (!this.worker || xdrs.length < 5) {
      // Small batches can be parsed on the main thread to avoid overhead
      return Promise.all(xdrs.map(xdr => this.fallbackParse(xdr)));
    }
    return this.sendToWorker('parse-batch', xdrs);
  }

  private sendToWorker(type: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        return reject(new Error('Worker not available'));
      }

      const id = uuidv4();
      this.pendingRequests.set(id, { resolve, reject });
      this.worker.postMessage({ id, type, payload });

      // Safety timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          const req = this.pendingRequests.get(id);
          req?.reject(new Error('Parser Worker timeout'));
          this.pendingRequests.delete(id);
        }
      }, 30000);
    });
  }

  private fallbackParse(xdrString: string): any {
    try {
      const { xdr, scValToNative } = require('@stellar/stellar-sdk');
      return scValToNative(xdr.ScVal.fromXDR(xdrString, 'base64'));
    } catch (error) {
      this.logger.warn(`Fallback parsing failed: ${error.message}`);
      return { error: error.message, raw: xdrString };
    }
  }
}
