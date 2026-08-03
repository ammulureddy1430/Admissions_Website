import { Module } from '@nestjs/common';
import { SchoolService } from './school.service';
import { SchoolController } from './school.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [SchoolController],
  providers: [SchoolService, PrismaService],
  exports: [SchoolService],
})
export class SchoolModule {}
