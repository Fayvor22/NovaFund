import { Injectable, Logger, type MessageEvent } from '@nestjs/common';
import { Observable, ReplaySubject, map } from 'rxjs';

const FUNDING_STREAM_REPLAY_BUFFER_SIZE = 50;

export interface FundingStreamEvent {
  id: string;
  projectId: string;
  raised?: number | string;
  amount?: number | string;
  backers?: number;
  timestamp?: string;
}

@Injectable()
export class FundingStreamService {
  private readonly logger = new Logger(FundingStreamService.name);
  private readonly events$ = new ReplaySubject<FundingStreamEvent>(
    FUNDING_STREAM_REPLAY_BUFFER_SIZE,
  );

  stream(): Observable<MessageEvent> {
    return this.events$.pipe(
      map((event) => ({
        data: event,
        id: event.id,
      })),
    );
  }

  publish(event: FundingStreamEvent): void {
    this.events$.next(event);
    this.logger.debug(`Published funding update ${event.id} for project ${event.projectId}`);
  }
}
