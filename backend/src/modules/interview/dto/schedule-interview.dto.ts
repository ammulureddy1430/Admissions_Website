import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class ScheduleInterviewDto {
  @IsNotEmpty({ message: 'Application ID is required.' })
  @IsString()
  applicationId: string;

  @IsNotEmpty({ message: 'Interviewer User ID is required.' })
  @IsString()
  interviewerId: string;

  @IsNotEmpty({ message: 'Date and time are required.' })
  @IsDateString({}, { message: 'Must be a valid ISO datetime string.' })
  dateTime: string;

  @IsOptional()
  @IsString()
  meetingLink?: string;
}

export class FeedbackInterviewDto {
  @IsNotEmpty({ message: 'Status is required.' })
  @IsString()
  status: string; // SCHEDULED, COMPLETED, CANCELLED, NO_SHOW

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;
}
