import { Injectable, NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateOrderDto, VerifyPaymentDto } from './dto/create-payment.dto';
import * as crypto from 'crypto';
import Razorpay = require('razorpay');
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class PaymentService {
  private razorpay: any = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (keyId && keySecret && !keyId.includes('dummy')) {
      try {
        this.razorpay = new Razorpay({
          key_id: keyId,
          key_secret: keySecret,
        });
      } catch (err) {
        console.error('Razorpay initialization failed.', err);
      }
    }
  }

  async createOrder(dto: CreateOrderDto, schoolId: string) {
    const app = await this.prisma.application.findFirst({
      where: { id: dto.applicationId, schoolId },
    });

    if (!app) {
      throw new NotFoundException('Application not found.');
    }

    const schoolSettings = await this.prisma.schoolSettings.findUnique({
      where: { schoolId },
    });

    const feeAmount = schoolSettings?.admissionFee || 1000.0;

    if (!this.razorpay) {
      const mockOrderId = `order_mock_${Math.random().toString(36).substring(2, 10)}`;
      await this.prisma.payment.create({
        data: {
          applicationId: dto.applicationId,
          schoolId,
          amount: feeAmount,
          currency: 'INR',
          status: 'PENDING',
          razorpayOrderId: mockOrderId,
        },
      });

      return {
        orderId: mockOrderId,
        amount: feeAmount,
        currency: 'INR',
        key: 'mock_key',
        mock: true,
      };
    }
    try {
        const order = await this.razorpay.orders.create({
          amount: Math.round(feeAmount * 100), // in paisa
          currency: 'INR',
          receipt: dto.applicationId,
        });

        // Save real payment order to DB
        await this.prisma.payment.create({
          data: {
            applicationId: dto.applicationId,
            schoolId,
            amount: feeAmount,
            currency: 'INR',
            status: 'PENDING',
            razorpayOrderId: order.id,
          },
        });

        return {
          orderId: order.id,
          amount: feeAmount,
          currency: 'INR',
          key: process.env.RAZORPAY_KEY_ID,
        };
    } catch (err) {
      console.error('Razorpay order creation failed.', err);
      throw new ServiceUnavailableException('Payment provider is temporarily unavailable.');
    }
  }

  async verifyPayment(dto: VerifyPaymentDto, schoolId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { razorpayOrderId: dto.razorpayOrderId, schoolId },
      include: { application: { include: { school: true } } },
    });

    if (!payment) {
      throw new NotFoundException('Order payment details not found.');
    }

    if (payment.status === 'SUCCESS') {
      return { success: true, message: 'Payment was already verified.' };
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (payment.razorpayOrderId.startsWith('order_mock_')) {
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'SUCCESS',
            razorpayPaymentId: dto.razorpayPaymentId,
            razorpaySignature: dto.razorpaySignature,
          },
        }),
        this.prisma.application.update({
          where: { id: payment.applicationId },
          data: { paymentStatus: 'PAID' },
        }),
      ]);
      const notification = await this.sendFatherPaymentConfirmation(payment, true);
      return { success: true, message: 'Mock Payment verified successfully.', notification };
    }

    // Standard Signature Validation
    if (!secret || secret.includes('dummy')) {
      throw new ServiceUnavailableException('Razorpay live credentials are not configured.');
    }

    const text = `${payment.razorpayOrderId}|${dto.razorpayPaymentId}`;
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(text)
      .digest('hex');

    if (generated_signature !== dto.razorpaySignature) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      await this.prisma.application.update({
        where: { id: payment.applicationId },
        data: { paymentStatus: 'FAILED' },
      });
      throw new BadRequestException('Invalid payment signature verification failed.');
    }

    // Update database records to success
    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          razorpayPaymentId: dto.razorpayPaymentId,
          razorpaySignature: dto.razorpaySignature,
        },
      }),
      this.prisma.application.update({
        where: { id: payment.applicationId },
        data: { paymentStatus: 'PAID' },
      }),
    ]);

    const notification = await this.sendFatherPaymentConfirmation(payment);
    return { success: true, message: 'Payment verified successfully.', notification };
  }

  private async sendFatherPaymentConfirmation(payment: any, demo = false) {
    const application = payment.application;
    if (!application.fatherPhone) {
      return { status: 'SKIPPED', reason: 'Father mobile number is not available.' };
    }

    const message = `Payment received: ${application.studentFirstName} ${application.studentLastName}'s registration fee of INR ${Number(payment.amount).toLocaleString('en-IN')} has been paid successfully to ${application.school.name}. Order ID: ${payment.razorpayOrderId}.`;
    try {
      const result = await this.notifications.sendWhatsApp(
        application.parentId,
        application.fatherPhone,
        message,
        application.schoolId,
      );
      if (demo && result.status === 'UNAVAILABLE') {
        await this.prisma.notification.update({
          where: { id: result.id },
          data: { status: 'DEMO_SENT' },
        });
        return { status: 'DEMO_SENT', phone: application.fatherPhone };
      }
      return { status: result.status, phone: application.fatherPhone };
    } catch (error) {
      console.error('Payment succeeded, but WhatsApp confirmation could not be queued.', error);
      return { status: 'FAILED', phone: application.fatherPhone };
    }
  }

  async findAll(schoolId: string) {
    return this.prisma.payment.findMany({
      where: { schoolId },
      include: {
        application: {
          select: {
            studentFirstName: true,
            studentLastName: true,
            grade: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByParent(parentId: string, schoolId: string) {
    return this.prisma.payment.findMany({
      where: {
        schoolId,
        application: {
          parentId,
        },
      },
      include: {
        application: {
          select: {
            studentFirstName: true,
            studentLastName: true,
            grade: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
