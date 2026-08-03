import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateLeadDto {
  @IsNotEmpty({ message: 'First name is required.' })
  @IsString()
  firstName: string;

  @IsNotEmpty({ message: 'Last name is required.' })
  @IsString()
  lastName: string;

  @IsEmail({}, { message: 'Please provide a valid email.' })
  email: string;

  @IsNotEmpty({ message: 'Phone number is required.' })
  @IsString()
  @Matches(/^(?:\+91)?[6-9]\d{9}$/, { message: 'Enter a valid 10-digit Indian mobile number.' })
  phone: string;

  @IsNotEmpty({ message: 'Target grade is required.' })
  @IsString()
  grade: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  source?: string; // WEBSITE, FACEBOOK, GOOGLE, REFERRAL, WALK_IN

  @IsOptional()
  @IsString()
  referredBy?: string;
}

export class UpdateLeadStatusDto {
  @IsNotEmpty({ message: 'Status is required.' })
  @IsString()
  status: string; // NEW, CONTACTED, APPLIED, LOST
}
