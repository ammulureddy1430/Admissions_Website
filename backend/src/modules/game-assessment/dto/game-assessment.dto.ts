import {
  IsArray,
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateGameAssessmentDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsString() assessmentType: string;
  @IsString() assessmentMode: string;
  @IsString() subject: string;
  @IsString() grade: string;
  @IsOptional() @IsString() section?: string;
  @IsOptional() @IsString() chapter?: string;
  @IsArray() @IsString({ each: true }) topics: string[];
  @IsOptional() @IsString() teacherName?: string;
  @IsOptional() @IsString() academicYear?: string;
  @IsString() difficulty: string;
  @IsString() language: string;
  @IsOptional() @IsString() learningOutcome?: string;
  @IsOptional() @IsString() boardId?: string;
  @IsOptional() @IsString() academicYearId?: string;
  @IsOptional() @IsString() gradeId?: string;
  @IsOptional() @IsString() subjectId?: string;
  @IsOptional() @IsString() chapterId?: string;
  @IsOptional() @IsString() topicId?: string;
  @IsOptional() @IsString() learningOutcomeId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) templateIds?: string[];
  @IsOptional() @IsString() textbookId?: string;
  @IsOptional() @IsString() textbookVersionId?: string;
  @IsInt() @Min(1) @Max(200) numberOfQuestions: number;
  @IsInt() @Min(1) @Max(20) numberOfGames: number;
  @IsInt() @Min(1) timeLimit: number;
  @IsInt() @Min(0) passingMarks: number;
  @IsInt() @Min(1) attemptLimit: number;
  @IsOptional() @IsDateString() startTime?: string;
  @IsOptional() @IsDateString() endTime?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsObject() settings: Record<string, unknown>;
  @IsOptional() @IsString() status?: string;
}

export class AssignGameDto {
  @IsString() gameAssessmentId: string;
  @IsString() targetType: string;
  @IsArray() @IsString({ each: true }) targetIds: string[];
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}
