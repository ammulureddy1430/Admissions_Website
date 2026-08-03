import { Module } from '@nestjs/common';
import { EmailWorkflowController } from './email-workflow.controller';
import { EmailWorkflowService } from './email-workflow.service';
import { PrismaService } from '../../prisma.service';
import { NotificationService } from '../notification/notification.service';

@Module({
  controllers: [EmailWorkflowController],
  providers: [EmailWorkflowService, PrismaService, NotificationService],
  exports: [EmailWorkflowService],
})
export class EmailWorkflowModule {}
