import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { GameAssessmentController } from './game-assessment.controller';
import { GameAssessmentService } from './game-assessment.service';

@Module({
  controllers: [GameAssessmentController],
  providers: [GameAssessmentService, PrismaService],
})
export class GameAssessmentModule {}

