import { IsIn, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export class CreateHigherEducationApplicationDto {
  @IsString() @IsNotEmpty() institutionName: string;
  @IsString() @IsNotEmpty() programme: string;
  @IsString() @IsNotEmpty() studyLevel: string;
  @IsString() @IsNotEmpty() intake: string;
}

export class CollegeReviewDto {
  @IsIn(['UNDER_REVIEW', 'DECISION']) status: 'UNDER_REVIEW' | 'DECISION';
  @ValidateIf((object) => object.status === 'DECISION')
  @IsIn(['ACCEPTED', 'DECLINED'])
  decision?: 'ACCEPTED' | 'DECLINED';
}
