import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Dual-axis rate limiter for the gasless relay endpoint.
 *
 * Axis 1 — IP address      : protects against anonymous flooding (15 req/min)
 * Axis 2 — Source account  : protects against a single wallet draining the
 *                            treasury even when rotating IPs (8 req/min)
 *
 * Both throttlers are declared in RelayModule's ThrottlerModule.forRoot().
 */
@Injectable()
export class RelayThrottlerGuard extends ThrottlerGuard {
  /**
   * Returns the bucket key for the current request.
   * Combines IP + source account so each axis tracks independently.
   */
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as Request;
    const ip = this.resolveIp(request);

    // Attempt to extract the source account from the DTO for per-wallet limiting.
    // If the field is absent (malformed body), fall back to IP only — the
    // transaction decoder in RelayService will reject it anyway.
    const sourceAccount: string | undefined = (request.body as { sourceAccount?: string })
      ?.sourceAccount;

    return sourceAccount ? `${ip}::${sourceAccount}` : ip;
  }

  private resolveIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  }
}