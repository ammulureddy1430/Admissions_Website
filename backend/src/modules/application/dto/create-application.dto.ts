import { IsBoolean, IsDateString, IsNotEmpty, IsOptional, IsString, Matches, ValidateIf } from 'class-validator';

export class CreateApplicationDto {
  @IsNotEmpty({ message: 'Student first name is required.' })
  @IsString()
  studentFirstName: string;

  @IsNotEmpty({ message: 'Student last name is required.' })
  @IsString()
  studentLastName: string;

  @IsNotEmpty({ message: 'Student date of birth is required.' })
  @IsDateString({}, { message: 'Date of birth must be a valid date string (ISO).' })
  studentDob: string;

  @IsNotEmpty({ message: 'Student gender is required.' })
  @IsString()
  studentGender: string;

  @IsNotEmpty({ message: 'Applied grade is required.' })
  @IsString()
  grade: string;

  // Student Personal Details
  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  religion?: string;

  @IsOptional()
  @IsString()
  motherTongue?: string;

  @IsOptional()
  @IsString()
  primaryAddress?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

  // Family Info
  @IsOptional()
  @IsString()
  fatherName?: string;

  @IsOptional()
  @IsString()
  fatherOccupation?: string;

  @IsOptional()
  @IsString()
  @ValidateIf((_, value) => value !== '')
  @Matches(/^(?:\+91)?[6-9]\d{9}$/, { message: 'Father phone must be a valid 10-digit Indian mobile number.' })
  fatherPhone?: string;

  @IsOptional()
  @IsString()
  motherName?: string;

  @IsOptional()
  @IsString()
  motherOccupation?: string;

  @IsOptional()
  @IsString()
  @ValidateIf((_, value) => value !== '')
  @Matches(/^(?:\+91)?[6-9]\d{9}$/, { message: 'Mother phone must be a valid 10-digit Indian mobile number.' })
  motherPhone?: string;

  // Academic History
  @IsOptional()
  @IsString()
  previousSchoolName?: string;

  @IsOptional()
  @IsString()
  previousSchoolGrade?: string;

  @IsOptional()
  @IsString()
  previousSchoolMarks?: string;

  // Medical & Emergency
  @IsOptional()
  @IsString()
  allergies?: string;

  @IsOptional()
  @IsString()
  medicalConditions?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @ValidateIf((_, value) => value !== '')
  @Matches(/^(?:\+91)?[6-9]\d{9}$/, { message: 'Emergency phone must be a valid 10-digit Indian mobile number.' })
  emergencyContactPhone?: string;

  // Guardian Info
  @IsOptional()
  @IsString()
  guardianName?: string;

  @IsOptional()
  @IsString()
  guardianOccupation?: string;

  @IsOptional()
  @IsString()
  @ValidateIf((_, value) => value !== '')
  @Matches(/^(?:\+91)?[6-9]\d{9}$/, { message: 'Guardian phone must be a valid 10-digit Indian mobile number.' })
  guardianPhone?: string;

  @IsOptional()
  @IsString()
  guardianRelation?: string;

  // Transport details
  @IsOptional()
  @IsString()
  transportRequired?: string;

  @IsOptional()
  @IsString()
  transportRoute?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateApplicationStatusDto {
  @IsNotEmpty({ message: 'Status is required.' })
  @IsString()
  status: string;
}

export class UpdateAssessmentRequirementDto {
  @IsBoolean()
  assessmentRequired: boolean;

  @IsOptional()
  @IsString()
  assessmentWaivedReason?: string;
}
