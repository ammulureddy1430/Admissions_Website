import { IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateGameDto {
  @IsString() name!: string;
  @IsString() slug!: string;
  @IsOptional() @IsString() description?: string;
  @IsString() category!: string;
  @IsString() ageGroup!: string;
  @IsString() difficulty!: string;
  @IsInt() @Min(1) durationSeconds!: number;
  @IsOptional() @IsString() thumbnail?: string;
  @IsString() componentName!: string;
  @IsOptional() @IsString() gameType?: string;
}

export class UpdateGameDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() ageGroup?: string;
  @IsOptional() @IsString() difficulty?: string;
  @IsOptional() @IsInt() @Min(1) durationSeconds?: number;
  @IsOptional() @IsString() thumbnail?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class AssignRealTimeGameDto {
  @IsString() ageGroup!: string;
  @IsArray() @IsString({ each: true }) studentIds!: string[];
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
}
