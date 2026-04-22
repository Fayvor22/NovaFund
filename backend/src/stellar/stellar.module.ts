import { Module } from '@nestjs/common';
import { RpcFallbackService } from './rpc-fallback.service';
import { RpcFallbackController } from './rpc-fallback.controller';
import { PathfinderService } from './pathfinder.service';

@Module({
  providers: [RpcFallbackService, PathfinderService],
  controllers: [RpcFallbackController],
  exports: [RpcFallbackService, PathfinderService],
})
export class StellarModule {}
