import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerDto {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsOptional()
  @IsString()
  selectedOption?: string;

  @IsOptional()
  @IsString()
  writtenAnswer?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  fileName?: string;
}

export class SubmitAssessmentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];

  @IsOptional()
  @IsString()
  submissionReason?: string;

  @IsOptional()
  @IsString()
  readingAudioUrl?: string;

  @IsOptional()
  @IsString()
  speakingVideoUrl?: string;

  @IsOptional()
  @IsNumber()
  listeningPlaysUsed?: number;

  @IsOptional()
  @IsNumber()
  listeningTimeTaken?: number;

  @IsOptional()
  @IsNumber()
  totalWarnings?: number;

  @IsOptional()
  @IsNumber()
  tabSwitchCount?: number;

  @IsOptional()
  @IsNumber()
  fullscreenExitCount?: number;
}
