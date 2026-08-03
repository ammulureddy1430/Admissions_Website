import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { TextbookController } from './textbook.controller';
import { TextbookService } from './textbook.service';

@Module({
  controllers: [TextbookController],
  providers: [TextbookService, PrismaService],
  exports: [TextbookService],
})
export class TextbookModule {}
