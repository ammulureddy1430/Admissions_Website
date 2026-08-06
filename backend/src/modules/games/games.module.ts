import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';

@Module({ controllers: [GamesController], providers: [GamesService, PrismaService], exports: [GamesService] })
export class GamesModule {}
