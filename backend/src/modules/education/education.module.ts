import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { EducationController } from './education.controller';
import { EducationService } from './education.service';

@Module({
  controllers: [EducationController],
  providers: [EducationService, PrismaService],
  exports: [EducationService],
})
export class EducationModule {}
