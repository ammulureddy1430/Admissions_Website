import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateTextbookDto {
  @IsOptional() @IsString() textbookId?: string;
  @IsString() title: string;
  @IsOptional() @IsString() subtitle?: string;
  @IsOptional() @IsString() description?: string;
  @IsString() boardId: string;
  @IsString() academicYearId: string;
  @IsString() gradeId: string;
  @IsString() subjectId: string;
  @IsString() language: string;
  @IsString() publisher: string;
  @IsString() author: string;
  @IsString() edition: string;
  @IsOptional() @IsString() isbn?: string;
  @IsOptional() @IsString() coverImage?: string;
  @IsOptional() @IsString() status?: string;
}

export class RestoreTextbookDto {
  @IsString() versionId: string;
}

export class UploadTextbookDto {
  @IsString() versionNumber: string;
  @IsOptional() @IsInt() @Min(1) numberOfPages?: number;
  @IsOptional() @IsString() changeNote?: string;
}
