import {
  Controller,
  Body,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import {
  AdminUniversityQueryDto,
  CatalogQueryDto,
  GlobalSearchQueryDto,
  UpsertCourseDto,
  UpsertUniversityDto,
} from './education.dto';
import { EducationService } from './education.service';

type AuthenticatedRequest = { user: User };

@Controller('education')
export class EducationController {
  constructor(private readonly educationService: EducationService) {}

  @Get('universities')
  listUniversities(@Query() query: AdminUniversityQueryDto) {
    query.includeUnpublished = false;
    return this.educationService.listUniversities(query);
  }

  @Get('countries')
  listCountries() {
    return this.educationService.listCountries();
  }

  @Get('universities/:slug')
  getUniversity(@Param('slug') slug: string) {
    return this.educationService.getUniversity(slug);
  }

  @Get('courses')
  listCourses(@Query() query: CatalogQueryDto) {
    return this.educationService.listCourses(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PARENT, Role.STUDENT)
  @Post('saved-universities/:universityId')
  saveUniversity(
    @Req() request: AuthenticatedRequest,
    @Param('universityId') universityId: string,
  ) {
    return this.educationService.saveUniversity(request.user.id, universityId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PARENT, Role.STUDENT)
  @Delete('saved-universities/:universityId')
  removeSavedUniversity(
    @Req() request: AuthenticatedRequest,
    @Param('universityId') universityId: string,
  ) {
    return this.educationService.removeSavedUniversity(
      request.user.id,
      universityId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PARENT, Role.STUDENT)
  @Get('saved-universities')
  getSavedUniversities(@Req() request: AuthenticatedRequest) {
    return this.educationService.getSavedUniversities(request.user.id);
  }

  @Get('compare')
  compareUniversities(@Query('ids') ids: string) {
    return this.educationService.compareUniversities(
      (ids ?? '').split(',').filter(Boolean),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('search')
  globalSearch(
    @Req() request: AuthenticatedRequest,
    @Query() query: GlobalSearchQueryDto,
  ) {
    return this.educationService.globalSearch(request.user.id, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  @Get('admin/universities')
  listAdminUniversities(@Query() query: AdminUniversityQueryDto) {
    return this.educationService.listUniversities(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  @Post('admin/universities')
  createUniversity(@Body() dto: UpsertUniversityDto) {
    return this.educationService.createUniversity(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  @Patch('admin/universities/:id')
  updateUniversity(
    @Param('id') id: string,
    @Body() dto: UpsertUniversityDto,
  ) {
    return this.educationService.updateUniversity(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Delete('admin/universities/:id')
  deleteUniversity(@Param('id') id: string) {
    return this.educationService.deleteUniversity(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  @Post('admin/universities/:universityId/courses')
  createCourse(
    @Param('universityId') universityId: string,
    @Body() dto: UpsertCourseDto,
  ) {
    return this.educationService.createCourse(universityId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  @Patch('admin/courses/:id')
  updateCourse(@Param('id') id: string, @Body() dto: UpsertCourseDto) {
    return this.educationService.updateCourse(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Delete('admin/courses/:id')
  deleteCourse(@Param('id') id: string) {
    return this.educationService.deleteCourse(id);
  }
}
