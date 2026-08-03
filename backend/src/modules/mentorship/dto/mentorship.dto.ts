import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

export class CreateMentorDto {
  @IsNotEmpty()
  @IsString()
  bio: string;

  @IsNotEmpty()
  @IsString()
  position: string;

  @IsNotEmpty()
  @IsString()
  company: string;

  @IsNotEmpty()
  @IsString()
  university: string;

  @IsNotEmpty()
  @IsString()
  country: string;

  @IsNotEmpty()
  @IsNumber()
  yearsExperience: number;

  @IsNotEmpty()
  @IsArray()
  languages: string[];

  @IsNotEmpty()
  @IsArray()
  skills: string[];

  @IsNotEmpty()
  @IsNumber()
  sessionPrice: number;

  @IsNotEmpty()
  @IsString()
  about: string;

  @IsNotEmpty()
  @IsArray()
  education: any[];

  @IsNotEmpty()
  @IsArray()
  experience: any[];

  @IsNotEmpty()
  @IsArray()
  achievements: string[];

  @IsOptional()
  @IsArray()
  research: string[];

  @IsOptional()
  @IsArray()
  certifications: string[];
}

export class UpdateMentorProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  headline?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  university?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsExperience?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sessionPrice?: number;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  about?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetDestinations?: string[];
}

export class BookSessionDto {
  @IsNotEmpty()
  @IsString()
  mentorId: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  sessionTypeId?: string;

  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(240)
  duration?: number;

  @IsNotEmpty()
  @IsString()
  topic: string;

  @IsOptional()
  @IsString()
  questions?: string;
}

export class UpdateSessionDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  meetingLink?: string;

  @IsOptional()
  @IsNumber()
  reviewRating?: number;

  @IsOptional()
  @IsString()
  reviewText?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @IsOptional()
  @IsString()
  attendanceStatus?: string;

  @IsOptional()
  @IsString()
  mentorNotes?: string;

  @IsOptional()
  @IsString()
  studentNotes?: string;
}

export class CreateReviewDto {
  @IsNotEmpty()
  @IsString()
  mentorId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsNotEmpty()
  @IsString()
  comment: string;
}

export class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  recipientId: string;

  @IsNotEmpty()
  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}

export class CreateSessionTypeDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(15)
  @Max(240)
  duration: number;

  @IsNumber()
  @Min(0)
  priceAmount: number;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class CreateAvailabilityDto {
  @IsOptional()
  @IsString()
  dayOfWeek?: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsDateString()
  slotDate?: string;

  @IsOptional()
  @IsBoolean()
  recurring?: boolean;
}

export class AddSessionResourceDto {
  @IsString()
  title: string;

  @IsUrl()
  url: string;

  @IsString()
  type: string;
}

export class CreateMentorResourceDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  url: string;
}

export class MentorResourceUploadDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  contentType: string;
}

export class PublishMentorResourceDto {
  @IsBoolean()
  published: boolean;
}

export class CreateSessionTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

export class CreateWebinarDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  host: string;

  @IsNotEmpty()
  @IsString()
  type: string;

  @IsNotEmpty()
  @IsString()
  time: string;

  @IsNotEmpty()
  @IsString()
  meetingLink: string;
}

export class CreateProjectDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsArray()
  milestones?: any[];
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  milestones?: any[];
}

export class SubmitResumeDto {
  @IsNotEmpty()
  @IsString()
  mentorId: string;

  @IsNotEmpty()
  @IsString()
  resumeUrl: string;
}

export class ReviewResumeDto {
  @IsNotEmpty()
  @IsNumber()
  score: number;

  @IsNotEmpty()
  @IsString()
  suggestions: string;

  @IsNotEmpty()
  @IsString()
  tips: string;
}

export class UpdatePortfolioDto {
  @IsNotEmpty()
  @IsString()
  bio: string;

  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @IsNotEmpty()
  @IsArray()
  skills: string[];
}
