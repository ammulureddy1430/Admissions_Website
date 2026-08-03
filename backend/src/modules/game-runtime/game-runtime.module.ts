import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { GameRuntimeController } from './game-runtime.controller';
import { GameRuntimeService } from './game-runtime.service';

@Module({ controllers: [GameRuntimeController], providers: [GameRuntimeService, PrismaService], exports: [GameRuntimeService] })
export class GameRuntimeModule {}
