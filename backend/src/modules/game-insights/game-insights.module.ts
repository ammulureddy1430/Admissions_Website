import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { GameInsightsController } from './game-insights.controller';
import { GameInsightsService } from './game-insights.service';

@Module({ controllers: [GameInsightsController], providers: [GameInsightsService, PrismaService], exports: [GameInsightsService] })
export class GameInsightsModule {}
