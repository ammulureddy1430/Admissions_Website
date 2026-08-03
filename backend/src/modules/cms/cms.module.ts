import { Module } from '@nestjs/common';
import { CMSService } from './cms.service';
import { CMSController } from './cms.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [CMSController],
  providers: [CMSService, PrismaService],
  exports: [CMSService],
})
export class CMSModule {}
