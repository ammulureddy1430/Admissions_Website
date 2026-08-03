import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreateOrderDto, VerifyPaymentDto } from './dto/create-payment.dto';
import { SchoolId } from '../../core/tenant.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import { Role } from '@prisma/client';
import type { Request } from 'express';

@Controller('payment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('order')
  @Roles(Role.PARENT)
  async createOrder(@Body() dto: CreateOrderDto, @SchoolId() schoolId: string) {
    return this.paymentService.createOrder(dto, schoolId);
  }

  @Post('verify')
  @Roles(Role.PARENT)
  async verifyPayment(@Body() dto: VerifyPaymentDto, @SchoolId() schoolId: string) {
    return this.paymentService.verifyPayment(dto, schoolId);
  }

  @Get()
  @Roles(Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF)
  async findAll(@SchoolId() schoolId: string) {
    return this.paymentService.findAll(schoolId);
  }

  @Get('parent')
  @Roles(Role.PARENT)
  async findByParent(@Req() req: Request, @SchoolId() schoolId: string) {
    const parent = req.user as any;
    return this.paymentService.findByParent(parent.id, schoolId);
  }
}
