import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { PrismaService } from '../../prisma.service';
import { VertexRagService } from './vertex-rag.service';

@Module({
  controllers: [AIController],
  providers: [AIService, VertexRagService, PrismaService],
  exports: [AIService, VertexRagService],
})
export class AIModule {}
