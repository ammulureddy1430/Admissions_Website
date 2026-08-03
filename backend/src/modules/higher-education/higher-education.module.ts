import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { HigherEducationController } from './higher-education.controller';
import { HigherEducationService } from './higher-education.service';

@Module({
  controllers: [HigherEducationController],
  providers: [HigherEducationService, PrismaService],
})
export class HigherEducationModule {}
