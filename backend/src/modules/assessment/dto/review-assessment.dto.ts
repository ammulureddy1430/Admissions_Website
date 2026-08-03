import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class GradeAnswerDto {
  @IsString()
  @IsNotEmpty()
  answerId: string;

  @IsNumber()
  marksObtained: number;

  @IsBoolean()
  isCorrect: boolean;

  @IsOptional()
  @IsString()
  teacherRemarks?: string;
}

export class ReviewAssessmentDto {
  @IsOptional()
  @IsString()
  submissionId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeAnswerDto)
  answers: GradeAnswerDto[];

  @IsString()
  @IsNotEmpty()
  status: string; // PASS, FAIL, NEEDS_IMPROVEMENT

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsNumber()
  readingManualScore?: number;

  @IsOptional()
  @IsString()
  readingTeacherRemarks?: string;

  @IsOptional()
  @IsNumber()
  speakingManualScore?: number;

  @IsOptional()
  @IsString()
  speakingTeacherRemarks?: string;

  @IsOptional()
  @IsNumber()
  listeningManualScore?: number;

  @IsOptional()
  @IsString()
  listeningTeacherRemarks?: string;

  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}
