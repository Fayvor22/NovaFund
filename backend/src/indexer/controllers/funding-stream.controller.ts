import { Controller, Sse, type MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { FundingStreamService } from '../services/funding-stream.service';

@Controller('funding')
export class FundingStreamController {
  constructor(private readonly fundingStreamService: FundingStreamService) {}

  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return this.fundingStreamService.stream();
  }
}
