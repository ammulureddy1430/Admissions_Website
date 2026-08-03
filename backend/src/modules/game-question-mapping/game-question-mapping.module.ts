import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { GameQuestionMappingController } from './game-question-mapping.controller';
import { GameQuestionMappingService } from './game-question-mapping.service';

@Module({
  controllers: [GameQuestionMappingController],
  providers: [GameQuestionMappingService, PrismaService],
})
export class GameQuestionMappingModule {}
