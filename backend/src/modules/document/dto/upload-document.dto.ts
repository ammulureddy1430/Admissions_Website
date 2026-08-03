import { IsNotEmpty, IsOptional, IsString, IsBoolean, IsNumber, IsArray } from 'class-validator';

export class CreateDocumentDto {
  @IsNotEmpty({ message: 'Application ID is required.' })
  @IsString()
  applicationId: string;

  @IsNotEmpty({ message: 'Document name is required.' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'Document type is required.' })
  @IsString()
  type: string;

  @IsNotEmpty({ message: 'Document URL is required.' })
  @IsString()
  url: string;
}

export class ReviewDocumentDto {
  @IsNotEmpty({ message: 'Status is required.' })
  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class CreateRequiredDocumentDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  categoryId: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  isConditional?: boolean;

  @IsOptional()
  @IsString()
  conditionRule?: string;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRequiredDocumentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  isConditional?: boolean;

  @IsOptional()
  @IsString()
  conditionRule?: string;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateVaultUploadDto {
  @IsNotEmpty()
  @IsString()
  applicationId: string;

  @IsOptional()
  @IsString()
  requiredDocumentId?: string;

  @IsNotEmpty()
  @IsString()
  categoryId: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  fileName: string;

  @IsNotEmpty()
  @IsString()
  fileType: string;

  @IsNotEmpty()
  @IsNumber()
  fileSize: number;

  @IsNotEmpty()
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  checksum?: string;
}

export class VerifyDocumentDto {
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class RejectDocumentDto {
  @IsNotEmpty()
  @IsString()
  rejectionReason: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class CreateCommentDto {
  @IsNotEmpty()
  @IsString()
  text: string;
}

export class BulkVerifyDto {
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  documentIds: string[];

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class BulkRejectDto {
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  documentIds: string[];

  @IsNotEmpty()
  @IsString()
  rejectionReason: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
