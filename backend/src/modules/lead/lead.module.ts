import { Module } from '@nestjs/common';
import { LeadService } from './lead.service';
import { LeadController } from './lead.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [LeadController],
  providers: [LeadService, PrismaService],
  exports: [LeadService],
})
export class LeadModule {}
