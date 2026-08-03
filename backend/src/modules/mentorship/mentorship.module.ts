import { Module } from '@nestjs/common';
import { MentorshipController } from './mentorship.controller';
import { MentorshipService } from './mentorship.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [MentorshipController],
  providers: [MentorshipService, PrismaService],
  exports: [MentorshipService],
})
export class MentorshipModule {}
