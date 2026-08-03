import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class GenerateGameQuestionsDto {
  @IsUUID() processedTextbookId!: string;
  @IsOptional() @IsUUID() gameAssessmentId?: string;
  @IsOptional() @IsUUID() chapterId?: string;
  @IsOptional() @IsUUID() topicId?: string;
  @IsOptional() @IsUUID() subtopicId?: string;
  @IsString() difficulty!: string;
  @IsArray() @IsString({ each: true }) questionTypes!: string[];
  @IsInt() @Min(1) @Max(100) questionCount!: number;
  @IsOptional() @IsString() learningOutcome?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) excludeQuestionTexts?: string[];
}

export class UpdateGameQuestionDto {
  @IsOptional() @IsString() questionText?: string;
  @IsOptional() @IsString() correctAnswer?: string;
  @IsOptional() @IsString() explanation?: string;
  @IsOptional() @IsString() difficulty?: string;
  @IsOptional() @IsString() questionType?: string;
  @IsOptional() @IsString() bloomLevel?: string;
  @IsOptional() @IsString() learningOutcome?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsArray() options?: Array<{ optionKey: string; optionText: string; isCorrect?: boolean }>;
}

export class ReviewGameQuestionsDto {
  @IsArray() @ArrayMinSize(1) @IsUUID('4', { each: true }) questionIds!: string[];
  @IsOptional() @IsString() note?: string;
}
