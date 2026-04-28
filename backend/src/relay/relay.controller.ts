import { Controller, Post, Body, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { RelayService } from './relay.service';
import { RelayTransactionDto } from './dto/relay.dto';
import { SkipThrottle } from '@nestjs/throttler';
import { RelayThrottlerGuard } from './relay-throttler.guard';

@Controller('relay')
@UseGuards(RelayThrottlerGuard)
export class RelayController {
  constructor(private readonly relayService: RelayService) {}

  @Post('fee-bump')
  @HttpCode(HttpStatus.OK)
  async relayFeeBump(@Body() dto: RelayTransactionDto) {
    return this.relayService.relayTransaction(dto.xdr);
  }

  /** Liveness probe — always bypasses throttling. */
  @Get('health')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  health(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /** Returns the sponsor public key so clients can verify the fee-payer. */
  @Get('info')
  @SkipThrottle()
  info(): { sponsorPublicKey: string } {
    return { sponsorPublicKey: this.relayService.sponsorPublicKey };
  }
}
