import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength, ValidateIf } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;

  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(6, { message: 'Password must be at least 6 characters long.' })
  password: string;

  @IsNotEmpty({ message: 'First name is required.' })
  @IsString()
  firstName: string;

  @IsNotEmpty({ message: 'Last name is required.' })
  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  @ValidateIf((_, value) => value !== '')
  @Matches(/^(?:\+91)?[6-9]\d{9}$/, { message: 'Enter a valid 10-digit Indian mobile number.' })
  phone?: string;
}
