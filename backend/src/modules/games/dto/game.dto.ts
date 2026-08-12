import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

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

export class BulkAssignRealTimeGamesDto {
  @IsString() ageGroup!: string;
  @IsOptional() @IsUUID() studentId?: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) @IsUUID('4', { each: true }) studentIds?: string[];
  @IsArray() @ArrayMinSize(1) @IsUUID('4', { each: true }) gameIds!: string[];
}

export class ReviewGameResultDto {
  @IsIn(['PENDING', 'REVIEWED', 'NEEDS_FOLLOW_UP']) reviewStatus!: string;
  @IsString() schoolReview!: string;
  @IsOptional() @IsString() recommendation?: string;
}
