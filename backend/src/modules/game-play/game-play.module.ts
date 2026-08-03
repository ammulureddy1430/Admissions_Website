import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { GameRuntimeModule } from '../game-runtime/game-runtime.module';
import { GameInsightsModule } from '../game-insights/game-insights.module';
import { GamePlayController } from './game-play.controller';
import { GamePlayService } from './game-play.service';

@Module({ imports: [GameRuntimeModule, GameInsightsModule], controllers: [GamePlayController], providers: [GamePlayService, PrismaService], exports: [GamePlayService] })
export class GamePlayModule {}
