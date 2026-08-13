import { IsArray, IsBoolean, IsDateString, IsInt, IsNumber, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateGameAssignmentDto {
  @IsUUID() generatedGameId!: string;
  @IsUUID() gameAssessmentId!: string;
  @IsString() targetType!: string;
  @IsArray() @IsString({ each: true }) targetIds!: string[];
  @IsOptional() @IsInt() @Min(1) maxAttempts?: number;
  @IsInt() @Min(0) allowedReassessments!: number;
  @IsOptional() @IsInt() @Min(1) timeLimitMinutes?: number;
  @IsNumber() passingScore!: number;
  @IsOptional() @IsBoolean() allowRestart?: boolean;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsObject() settings?: Record<string, unknown>;
}

export class UpdateGameAssignmentDto {
  @IsInt() @Min(0) allowedReassessments!: number;
}

export class SubmitGameDto {
  @IsUUID() sessionId!: string;
}
