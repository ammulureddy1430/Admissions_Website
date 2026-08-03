import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { GameRuntimeModule } from '../game-runtime/game-runtime.module';
import { GeneratedGamesController } from './generated-games.controller';
import { GeneratedGamesService } from './generated-games.service';

@Module({ imports: [GameRuntimeModule], controllers: [GeneratedGamesController], providers: [GeneratedGamesService, PrismaService], exports: [GeneratedGamesService] })
export class GeneratedGamesModule {}
