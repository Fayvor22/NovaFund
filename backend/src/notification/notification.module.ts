import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './services/notification.service';
import { EmailService } from './services/email.service';
import { WebPushService } from './services/web-push.service';
import { PreferencesService } from './services/preferences.service';
import { DeadlineAlertTask } from './tasks/deadline-alert.task';
import { EmailRetryTask } from './tasks/email-retry.task';
import { DatabaseModule } from '../database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    EmailService,
    WebPushService,
    PreferencesService,
    DeadlineAlertTask,
    EmailRetryTask,
  ],
  exports: [NotificationService, PreferencesService],
})
export class NotificationModule { }
