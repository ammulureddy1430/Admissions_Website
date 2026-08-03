import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class QuestionDto {
  @IsString()
  @IsNotEmpty()
  type: string; // MCQ, WRITTEN, FILE_UPLOAD

  @IsString()
  @IsNotEmpty()
  questionText: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsString()
  correctAnswer?: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsNumber()
  marks: number;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isListening?: boolean;
}

export class CreateAssessmentDto {
  @IsOptional()
  @IsString()
  textbookId?: string;

  @IsOptional()
  @IsString()
  textbookVersionId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsString()
  @IsNotEmpty()
  grade: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  difficulty: string;

  @IsNumber()
  questionCount: number;

  @IsNumber()
  timeLimit: number;

  @IsNumber()
  totalMarks: number;

  @IsNumber()
  passingMarks: number;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsBoolean()
  allowCalculator?: boolean;

  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @IsOptional()
  @IsBoolean()
  shuffleOptions?: boolean;

  @IsOptional()
  @IsBoolean()
  showResultImmediately?: boolean;

  @IsOptional()
  @IsBoolean()
  allowRetake?: boolean;

  @IsOptional()
  @IsNumber()
  retakeCount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions?: QuestionDto[];

  @IsOptional()
  @IsBoolean()
  hasWritten?: boolean;

  @IsOptional()
  @IsBoolean()
  hasReading?: boolean;

  @IsOptional()
  @IsBoolean()
  hasSpeaking?: boolean;

  @IsOptional()
  @IsString()
  readingMaterialType?: string;

  @IsOptional()
  @IsString()
  readingMaterialUrl?: string;

  @IsOptional()
  @IsString()
  readingText?: string;

  @IsOptional()
  @IsNumber()
  readingTime?: number;

  @IsOptional()
  @IsNumber()
  readingRecordDuration?: number;

  @IsOptional()
  @IsString()
  readingInstructions?: string;

  @IsOptional()
  @IsNumber()
  readingTotalMarks?: number;

  @IsOptional()
  @IsNumber()
  readingPassingMarks?: number;

  @IsOptional()
  @IsString()
  speakingActivityType?: string;

  @IsOptional()
  @IsString()
  speakingMaterialType?: string;

  @IsOptional()
  @IsString()
  speakingMaterialUrl?: string;

  @IsOptional()
  @IsString()
  speakingPrompt?: string;

  @IsOptional()
  @IsNumber()
  speakingPrepTime?: number;

  @IsOptional()
  @IsNumber()
  speakingTimeLimit?: number;

  @IsOptional()
  @IsNumber()
  speakingTotalMarks?: number;

  @IsOptional()
  @IsNumber()
  speakingPassingMarks?: number;

  @IsOptional()
  @IsBoolean()
  hasListening?: boolean;

  @IsOptional()
  @IsString()
  listeningActivityType?: string;

  @IsOptional()
  @IsString()
  listeningMaterialType?: string;

  @IsOptional()
  @IsString()
  listeningMaterialUrl?: string;

  @IsOptional()
  @IsString()
  listeningTranscript?: string;

  @IsOptional()
  @IsString()
  listeningInstructions?: string;

  @IsOptional()
  @IsNumber()
  listeningPlaysAllowed?: number;

  @IsOptional()
  @IsNumber()
  listeningAudioSpeed?: number;

  @IsOptional()
  @IsNumber()
  listeningPrepTime?: number;

  @IsOptional()
  @IsNumber()
  listeningDuration?: number;

  @IsOptional()
  @IsNumber()
  listeningTotalMarks?: number;

  @IsOptional()
  @IsNumber()
  listeningPassingMarks?: number;

  @IsOptional()
  @IsNumber()
  listeningTimeLimit?: number;

  @IsOptional()
  @IsString()
  assessmentMode?: string;

  @IsOptional()
  @IsBoolean()
  proctoringEnabled?: boolean;
}
