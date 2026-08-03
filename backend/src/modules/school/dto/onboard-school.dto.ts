import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength } from 'class-validator';

export class OnboardSchoolDto {
  @IsNotEmpty({ message: 'School name is required.' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'School code is required.' })
  @IsString()
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'School code can only contain letters, numbers, and hyphens.',
  })
  schoolCode: string;

  @IsIn(['Preschool', 'School', 'College'])
  schoolType: string;

  @IsIn(['CBSE', 'ICSE', 'State', 'IB', 'Cambridge'])
  board: string;

  @IsOptional()
  @IsString()
  @MaxLength(100000, { message: 'Logo must be smaller than 75 KB.' })
  logo?: string;

  @IsNotEmpty() @IsString() address: string;
  @IsNotEmpty() @IsString() city: string;
  @IsNotEmpty() @IsString() state: string;
  @IsNotEmpty() @IsString() country: string;
  @IsNotEmpty() @IsString() contactPerson: string;
  @IsEmail({}, { message: 'School email must be a valid email.' })
  email: string;
  @IsNotEmpty() @IsString() phone: string;

  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: 'Website must include http:// or https://.' })
  website?: string;

  @IsNotEmpty() @IsString() principalName: string;

  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'Primary brand color must be a valid hex color.' })
  primaryBrandColor: string;

  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'Secondary brand color must be a valid hex color.' })
  secondaryBrandColor: string;

  @IsOptional()
  @IsEmail({}, { message: 'Support email must be a valid email.' })
  supportEmail?: string;

  @IsOptional()
  @IsString()
  supportPhone?: string;

  @IsEmail({}, { message: 'Admin email must be a valid email.' })
  adminEmail: string;

  @IsNotEmpty({ message: 'Admin password is required.' })
  @MinLength(6, { message: 'Admin password must be at least 6 characters long.' })
  adminPassword: string;

  @IsNotEmpty({ message: 'Admin first name is required.' })
  @IsString()
  adminFirstName: string;

  @IsNotEmpty({ message: 'Admin last name is required.' })
  @IsString()
  adminLastName: string;
}
