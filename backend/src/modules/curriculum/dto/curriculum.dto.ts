import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateBoardDto {
  @IsString() name: string;
  @IsString() code: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() status?: string;
}

export class CreateAcademicYearDto {
  @IsString() boardId: string;
  @IsString() name: string;
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
  @IsOptional() @IsBoolean() isCurrent?: boolean;
  @IsOptional() @IsString() status?: string;
}

export class CreateGradeDto {
  @IsString() boardId: string;
  @IsString() academicYearId: string;
  @IsString() name: string;
  @IsInt() @Min(0) sortOrder: number;
  @IsOptional() @IsString() status?: string;
}

export class CreateSubjectDto {
  @IsString() gradeId: string;
  @IsString() name: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isCustom?: boolean;
  @IsOptional() @IsString() status?: string;
}

export class CreateChapterDto {
  @IsString() subjectId: string;
  @IsString() name: string;
  @IsInt() @Min(0) chapterNumber: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0) estimatedTeachingHours?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) learningObjectives?: string[];
  @IsOptional() @IsString() status?: string;
}

export class CreateTopicDto {
  @IsString() chapterId: string;
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() difficulty?: string;
  @IsOptional() @IsInt() @Min(0) estimatedDuration?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) learningObjectives?: string[];
  @IsOptional() @IsString() status?: string;
}

export class CreateLearningOutcomeDto {
  @IsString() topicId: string;
  @IsString() outcome: string;
  @IsString() outcomeCode: string;
  @IsString() bloomLevel: string;
  @IsOptional() @IsString() difficulty?: string;
  @IsOptional() @IsString() status?: string;
}

export class CreateCategoryDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() status?: string;
}

export class CreateGameTemplateDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() templateId?: string;
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsString() categoryId: string;
  @IsOptional() @IsString() difficulty?: string;
  @IsInt() @Min(1) estimatedDuration: number;
  @IsInt() @Min(1) minimumQuestions: number;
  @IsInt() @Min(1) @Max(500) maximumQuestions: number;
  @IsArray() @IsString({ each: true }) supportedDevices: string[];
  @IsOptional() @IsString() thumbnail?: string;
  @IsOptional() @IsString() previewImage?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) gradeIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) subjectIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) chapterIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) topicIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) learningOutcomeIds?: string[];
  @IsOptional() @IsString() changeNote?: string;
}

export class TemplateActionDto {
  @IsString() action: string;
}
