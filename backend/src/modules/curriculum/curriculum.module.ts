import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CurriculumController } from './curriculum.controller';
import { CurriculumService } from './curriculum.service';

@Module({
  controllers: [CurriculumController],
  providers: [CurriculumService, PrismaService],
  exports: [CurriculumService],
})
export class CurriculumModule {}
