import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { GameAIQuestionsController } from './game-ai-questions.controller';
import { GameAIQuestionsService } from './game-ai-questions.service';

@Module({
  controllers: [GameAIQuestionsController],
  providers: [GameAIQuestionsService, PrismaService],
  exports: [GameAIQuestionsService],
})
export class GameAIQuestionsModule {}
