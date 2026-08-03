import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class LogAssessmentEventDto {
  @IsNotEmpty()
  @IsString()
  eventType: string;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsString()
  browser?: string;

  @IsOptional()
  @IsString()
  device?: string;
}

export class UpdateSecurityStatsDto {
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
