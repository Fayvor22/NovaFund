import { parentPort } from 'worker_threads';
import { xdr, scValToNative } from '@stellar/stellar-sdk';

/**
 * Worker thread for heavy XDR parsing tasks.
 * This prevents blocking the main event loop when decoding large ledger chunks or event batches.
 */

if (!parentPort) {
  throw new Error('This file must be run as a worker thread');
}

parentPort.on('message', (message) => {
  const { id, type, payload } = message;

  try {
    switch (type) {
      case 'parse-scval': {
        const parsed = scValToNative(xdr.ScVal.fromXDR(payload, 'base64'));
        parentPort.postMessage({ id, type: 'success', payload: parsed });
        break;
      }

      case 'parse-batch': {
        const results = payload.map((item: string) => {
          try {
            return scValToNative(xdr.ScVal.fromXDR(item, 'base64'));
          } catch (e) {
            return { error: e.message, raw: item };
          }
        });
        parentPort.postMessage({ id, type: 'success', payload: results });
        break;
      }

      default:
        parentPort.postMessage({ id, type: 'error', payload: `Unknown task type: ${type}` });
    }
  } catch (error) {
    parentPort.postMessage({ id, type: 'error', payload: error.message });
  }
});
