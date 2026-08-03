import { IsUUID } from 'class-validator';

export class ProcessDocumentDto {
  @IsUUID()
  textbookVersionId!: string;
}

export class ReprocessDocumentDto {
  @IsUUID()
  processedTextbookId!: string;
}
