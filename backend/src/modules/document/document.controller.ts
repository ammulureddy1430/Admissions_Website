import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { DocumentService } from './document.service';
import { 
  CreateDocumentDto, 
  ReviewDocumentDto,
  CreateVaultUploadDto,
  VerifyDocumentDto,
  RejectDocumentDto,
  CreateCommentDto,
  CreateRequiredDocumentDto,
  UpdateRequiredDocumentDto,
  BulkVerifyDto,
  BulkRejectDto
} from './dto/upload-document.dto';
import { SchoolId, OptionalSchoolId } from '../../core/tenant.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma.service';

@Controller('document')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('presigned-url')
  async getPresignedUrl(
    @Query('applicationId') applicationId: string,
    @Query('fileName') fileName: string,
    @SchoolId() schoolId: string,
  ) {
    return this.documentService.getPresignedUploadUrl(applicationId, fileName, schoolId);
  }

  // --- CONFIG / REQUIRED CHECKLISTS ---
  @Get('categories')
  async getCategories() {
    return this.documentService.getCategories();
  }

  @Get('required')
  async getRequired(@SchoolId() schoolId: string, @Query('grade') grade?: string) {
    return this.documentService.getRequired(schoolId, grade);
  }

  @Post('required')
  @Roles(Role.SCHOOL_ADMIN)
  async createRequired(@Body() dto: CreateRequiredDocumentDto, @SchoolId() schoolId: string) {
    return this.documentService.createRequired(dto, schoolId);
  }

  @Patch('required/:id')
  @Roles(Role.SCHOOL_ADMIN)
  async updateRequired(
    @Param('id') id: string,
    @Body() dto: UpdateRequiredDocumentDto,
    @SchoolId() schoolId: string
  ) {
    return this.documentService.updateRequired(id, dto, schoolId);
  }

  @Delete('required/:id')
  @Roles(Role.SCHOOL_ADMIN)
  async deleteRequired(@Param('id') id: string, @SchoolId() schoolId: string) {
    return this.documentService.deleteRequired(id, schoolId);
  }

  // --- VAULT CORE ---
  @Get('vault/school/dashboard')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async getSchoolDashboard(@SchoolId() schoolId: string) {
    return this.documentService.getSchoolDashboard(schoolId);
  }

  @Get('vault/school/students')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async getSchoolStudents(@SchoolId() schoolId: string) {
    return this.documentService.getSchoolStudents(schoolId);
  }

  @Get('vault/admin/dashboard')
  @Roles(Role.SUPER_ADMIN)
  async getAdminDashboard() {
    return this.documentService.getAdminDashboard();
  }

  @Get('vault/admin/audit-logs')
  @Roles(Role.SUPER_ADMIN)
  async getAdminAuditLogs() {
    return this.documentService.getAdminAuditLogs();
  }

  @Get('vault/:applicationId')
  async getVault(
    @Param('applicationId') applicationId: string,
    @Req() req: any,
    @OptionalSchoolId() schoolId?: string
  ) {
    return this.documentService.getVault(applicationId, req.user.id, req.user.role, schoolId);
  }

  @Post('vault/upload')
  async uploadVaultFile(@Body() dto: CreateVaultUploadDto, @Req() req: any, @SchoolId() schoolId: string) {
    return this.documentService.uploadVaultFile(dto, req.user.id, schoolId);
  }

  @Patch('vault/document/:id/verify')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async verifyDocument(
    @Param('id') id: string,
    @Body() dto: VerifyDocumentDto,
    @Req() req: any,
    @SchoolId() schoolId: string
  ) {
    return this.documentService.verifyDocument(id, dto, req.user.id, schoolId);
  }

  @Patch('vault/document/:id/reject')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async rejectDocument(
    @Param('id') id: string,
    @Body() dto: RejectDocumentDto,
    @Req() req: any,
    @SchoolId() schoolId: string
  ) {
    return this.documentService.rejectDocument(id, dto, req.user.id, schoolId);
  }

  @Post('vault/document/:id/comment')
  async addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @Req() req: any,
    @SchoolId() schoolId: string
  ) {
    return this.documentService.addComment(id, dto, req.user.id, schoolId);
  }

  @Delete('vault/document/:id')
  async deleteDocument(@Param('id') id: string, @Req() req: any, @SchoolId() schoolId: string) {
    return this.documentService.deleteDocument(id, req.user.id, schoolId);
  }

  @Post('vault/bulk-verify')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async bulkVerify(@Body() dto: BulkVerifyDto, @Req() req: any, @SchoolId() schoolId: string) {
    return this.documentService.bulkVerify(dto, req.user.id, schoolId);
  }

  @Post('vault/bulk-reject')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async bulkReject(@Body() dto: BulkRejectDto, @Req() req: any, @SchoolId() schoolId: string) {
    return this.documentService.bulkReject(dto, req.user.id, schoolId);
  }

  // --- BACKWARD COMPATIBILITY ENDPOINTS ---
  @Post()
  async create(@Body() dto: CreateDocumentDto, @SchoolId() schoolId: string) {
    // Fallback: redirects to the new vault structure
    const app = await this.prisma.application.findUnique({ where: { id: dto.applicationId } });
    if (!app) throw new NotFoundException('Application not found.');
    
    // Find category or default to Additional category
    const cat = await this.prisma.documentCategory.findFirst({
      where: { code: 'ADDITIONAL' }
    });

    return this.documentService.uploadVaultFile({
      applicationId: dto.applicationId,
      categoryId: cat ? cat.id : '',
      name: dto.name,
      fileName: dto.type.toLowerCase() + '.pdf',
      fileType: 'application/pdf',
      fileSize: 1024 * 100, // 100 KB default
      url: dto.url
    }, app.parentId, schoolId);
  }

  @Get()
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async findAll(@SchoolId() schoolId: string) {
    return this.documentService.getSchoolStudents(schoolId);
  }

  @Patch(':id/review')
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async review(
    @Param('id') id: string,
    @Body() dto: ReviewDocumentDto,
    @Req() req: any,
    @SchoolId() schoolId: string,
  ) {
    if (dto.status === 'APPROVED' || dto.status === 'VERIFIED') {
      return this.documentService.verifyDocument(id, {}, req.user.id, schoolId);
    } else {
      return this.documentService.rejectDocument(id, { rejectionReason: dto.rejectionReason || 'Review rejected' }, req.user.id, schoolId);
    }
  }
}
