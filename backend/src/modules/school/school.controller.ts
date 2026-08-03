import { Controller, Post, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SchoolService } from './school.service';
import { OnboardSchoolDto } from './dto/onboard-school.dto';
import { SchoolId } from '../../core/tenant.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('school')
export class SchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  @Post('onboard')
  async onboard(@Body() dto: OnboardSchoolDto) {
    return this.schoolService.onboard(dto);
  }

  @Get('list')
  async list() {
    return this.schoolService.listAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('details')
  async getDetails(@SchoolId() schoolId: string) {
    return this.schoolService.getDetails(schoolId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('settings')
  async updateSettings(
    @SchoolId() schoolId: string,
    @Body() data: {
      admissionFee?: number;
      autoApproveLeads?: boolean;
      supportEmail?: string;
      supportPhone?: string;
      paymentUpiId?: string;
      paymentPageUrl?: string;
      aiContext?: string;
      assessmentAiEnabled?: boolean;
      assessmentAiMode?: string;
      assessmentAiLogChats?: boolean;
      logo?: string | null;
      schoolPhone?: string;
    },
  ) {
    return this.schoolService.updateSettings(schoolId, data);
  }
}
