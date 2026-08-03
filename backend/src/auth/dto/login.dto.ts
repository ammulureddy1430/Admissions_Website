import { IsEmail, IsIn, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;

  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(6, { message: 'Password must be at least 6 characters long.' })
  password: string;

  @IsIn(['parent', 'study-abroad', 'school', 'super-admin'], { message: 'Please select a valid login portal.' })
  portal: 'parent' | 'study-abroad' | 'school' | 'super-admin';
}
