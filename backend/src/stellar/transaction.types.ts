// transaction.types.ts

export type TransactionStatus = 'PENDING' | 'SIGNED' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED';

export interface TransactionRecord {
  id: string;
  userId: string;
  status: TransactionStatus;
  xdr: string;
  signedXdr?: string;
  createdAt: Date;
  updatedAt: Date;
  fee?: string;
  error?: string;
  simulationResults?: any;
}

export interface SimulationResult {
  success: boolean;
  minResourceFee?: string;
  error?: string;
  events?: any[];
  results?: any[];
}
