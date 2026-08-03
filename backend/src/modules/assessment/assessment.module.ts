import { Module } from '@nestjs/common';
import { AssessmentService } from './assessment.service';
import { AssessmentController } from './assessment.controller';
import { StudentAssessmentController } from './student-assessment.controller';
import { PrismaService } from '../../prisma.service';
import { AIModule } from '../ai/ai.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AIModule, AuthModule],
  controllers: [AssessmentController, StudentAssessmentController],
  providers: [AssessmentService, PrismaService],
  exports: [AssessmentService],
})
export class AssessmentModule {}
