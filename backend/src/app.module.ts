import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { SchoolModule } from './modules/school/school.module';
import { ApplicationModule } from './modules/application/application.module';
import { DocumentModule } from './modules/document/document.module';
import { InterviewModule } from './modules/interview/interview.module';
import { PaymentModule } from './modules/payment/payment.module';
import { NotificationModule } from './modules/notification/notification.module';
import { CMSModule } from './modules/cms/cms.module';
import { AIModule } from './modules/ai/ai.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { PrismaService } from './prisma.service';
import { HigherEducationModule } from './modules/higher-education/higher-education.module';
import { MentorshipModule } from './modules/mentorship/mentorship.module';
import { EducationModule } from './modules/education/education.module';
import { EmailWorkflowModule } from './modules/email-workflow/email-workflow.module';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { GameAssessmentModule } from './modules/game-assessment/game-assessment.module';
import { CurriculumModule } from './modules/curriculum/curriculum.module';
import { TextbookModule } from './modules/textbook/textbook.module';
import { GameDocumentProcessingModule } from './modules/game-document-processing/game-document-processing.module';
import { GameAIQuestionsModule } from './modules/game-ai-questions/game-ai-questions.module';
import { GameQuestionMappingModule } from './modules/game-question-mapping/game-question-mapping.module';
import { GameRuntimeModule } from './modules/game-runtime/game-runtime.module';
import { GeneratedGamesModule } from './modules/generated-games/generated-games.module';
import { GamePlayModule } from './modules/game-play/game-play.module';
import { GameInsightsModule } from './modules/game-insights/game-insights.module';
import { GamesModule } from './modules/games/games.module';
import { TenantMiddleware } from './core/tenant.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    SchoolModule,
    ApplicationModule,
    HigherEducationModule,
    MentorshipModule,
    EducationModule,
    DocumentModule,
    InterviewModule,
    PaymentModule,
    NotificationModule,
    CMSModule,
    AIModule,
    AnalyticsModule,
    SuperAdminModule,
    EmailWorkflowModule,
    AssessmentModule,
    GameAssessmentModule,
    CurriculumModule,
    TextbookModule,
    GameDocumentProcessingModule,
    GameAIQuestionsModule,
    GameQuestionMappingModule,
    GameRuntimeModule,
    GeneratedGamesModule,
    GamePlayModule,
    GameInsightsModule,
    GamesModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes('*');
  }
}
