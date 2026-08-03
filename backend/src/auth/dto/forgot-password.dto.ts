import { IsEmail, IsIn, IsOptional, IsUUID } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;

  @IsOptional()
  @IsUUID('4', { message: 'Please select a valid school.' })
  schoolId?: string;

  @IsOptional()
  @IsIn(['school', 'study-abroad'])
  portal?: 'school' | 'study-abroad';
}
