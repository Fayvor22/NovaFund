import { Module } from '@nestjs/common';
import { RelayService } from './relay.service';
import { RelayController } from './relay.controller';
import { StellarModule } from '../stellar/stellar.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { RelayThrottlerGuard } from './relay-throttler.guard';

@Module({
  imports: [
    StellarModule,
    ThrottlerModule.forRoot([
      { name: 'ip', ttl: 60_000, limit: 15 }, // 15 req/min per IP
      { name: 'wallet', ttl: 60_000, limit: 8 }, // 8 req/min per source wallet
    ]),
  ],
  providers: [RelayService, RelayThrottlerGuard],
  controllers: [RelayController],
  exports: [RelayService],
})
export class RelayModule {}
