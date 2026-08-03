import { IsArray, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class GenerateGameDto {
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() gameAssessmentId?: string;
  @IsArray() @IsUUID('4', { each: true }) questionIds!: string[];
  @IsOptional() @IsUUID() templateId?: string;
  @IsOptional() @IsString() engineKey?: string;
  @IsOptional() @IsObject() configuration?: Record<string, unknown>;
}

export class UpdateGeneratedGameDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() templateId?: string;
  @IsOptional() @IsString() engineKey?: string;
  @IsOptional() @IsObject() configuration?: Record<string, unknown>;
  @IsOptional() @IsString() changeNote?: string;
}
