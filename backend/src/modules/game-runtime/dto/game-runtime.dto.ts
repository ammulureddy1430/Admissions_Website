import { IsArray, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class StartRuntimeDto {
  @IsString() engineKey!: string;
  @IsArray() @IsUUID('4', { each: true }) questionIds!: string[];
  @IsOptional() @IsObject() configuration?: Record<string, unknown>;
  @IsOptional() @IsString() mode?: string;
}

export class RuntimeActionDto {
  @IsString() action!: string;
  @IsOptional() payload?: unknown;
}
