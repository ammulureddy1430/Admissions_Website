import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { TextbookModule } from '../textbook/textbook.module';
import { GameDocumentProcessingController } from './game-document-processing.controller';
import { GameDocumentProcessingService } from './game-document-processing.service';

@Module({
  imports: [TextbookModule],
  controllers: [GameDocumentProcessingController],
  providers: [GameDocumentProcessingService, PrismaService],
})
export class GameDocumentProcessingModule {}
