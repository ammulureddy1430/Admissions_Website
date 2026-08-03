import { IsBoolean, IsInt, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class SaveGameMappingDto {
  @IsUUID() questionId!: string;
  @IsUUID() selectedTemplateId!: string;
  @IsOptional() @IsUUID() recommendedTemplateId?: string;
  @IsOptional() @IsBoolean() acceptedRecommendation?: boolean;
  @IsOptional() @IsString() recommendationReason?: string;
  @IsOptional() @IsString() recommendationKey?: string;
  @IsString() difficulty!: string;
  @IsInt() @Min(0) timerSeconds!: number;
  @IsInt() @Min(0) lives!: number;
  @IsObject() scoringRules!: Record<string, unknown>;
  @IsObject() hintRules!: Record<string, unknown>;
  @IsObject() animationConfiguration!: Record<string, unknown>;
  @IsObject() soundConfiguration!: Record<string, unknown>;
  @IsObject() accessibilitySettings!: Record<string, unknown>;
}
