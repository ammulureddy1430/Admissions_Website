import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Resend } from 'resend';
import twilio from 'twilio';
import { UpdateNotificationPreferencesDto } from './notification.dto';

@Injectable()
export class NotificationService {
  private resend: Resend | null = null;
  private twilioClient: any = null;

  constructor(private readonly prisma: PrismaService) {
    const resendKey = process.env.RESEND_API_KEY;
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;

    if (resendKey && !resendKey.includes('dummy')) {
      try {
        this.resend = new Resend(resendKey);
      } catch (err) {
        console.warn('Resend initialization failed:', err);
      }
    }

    if (twilioSid && twilioToken && !twilioSid.includes('dummy')) {
      try {
        this.twilioClient = twilio(twilioSid, twilioToken);
      } catch (err) {
        console.warn('Twilio initialization failed:', err);
      }
    }
  }

  async sendEmail(userId: string, email: string, title: string, message: string, schoolId?: string) {
    // 1. Create DB log
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        schoolId,
        title,
        message,
        type: 'EMAIL',
        status: 'PENDING',
      },
    });

    console.log(`[EMAIL QUEUE] Sending to ${email}: [${title}] ${message}`);

    let status: 'SENT' | 'FAILED' | 'UNAVAILABLE' = this.resend ? 'SENT' : 'UNAVAILABLE';

    if (this.resend) {
      try {
        await this.resend.emails.send({
          from: 'AdmissionsOS <admissions@admissionsos.com>',
          to: email,
          subject: title,
          html: `<p>${message}</p>`,
        });
      } catch (err) {
        console.error('Resend failed to send email:', err);
        status = 'FAILED';
      }
    }

    // Update status in DB
    return this.prisma.notification.update({
      where: { id: notification.id },
      data: { status },
    });
  }

  async sendSMS(userId: string, phone: string, message: string, schoolId: string) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        schoolId,
        title: 'SMS Alert',
        message,
        type: 'SMS',
        status: 'PENDING',
      },
    });

    console.log(`[SMS QUEUE] Sending to ${phone}: ${message}`);

    let status: 'SENT' | 'FAILED' | 'UNAVAILABLE' = this.twilioClient ? 'SENT' : 'UNAVAILABLE';

    if (this.twilioClient) {
      try {
        await this.twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER || '+15005550006',
          to: phone,
        });
      } catch (err) {
        console.error('Twilio failed to send SMS:', err);
        status = 'FAILED';
      }
    }

    return this.prisma.notification.update({
      where: { id: notification.id },
      data: { status },
    });
  }

  async sendWhatsApp(userId: string, phone: string, message: string, schoolId: string) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        schoolId,
        title: 'WhatsApp Alert',
        message,
        type: 'WHATSAPP',
        status: 'PENDING',
      },
    });

    console.log(`[WHATSAPP QUEUE] Sending to ${phone}: ${message}`);

    let status: 'SENT' | 'FAILED' | 'UNAVAILABLE' = this.twilioClient ? 'SENT' : 'UNAVAILABLE';

    if (this.twilioClient) {
      try {
        await this.twilioClient.messages.create({
          body: message,
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886'}`,
          to: `whatsapp:${phone}`,
        });
      } catch (err) {
        console.error('Twilio failed to send WhatsApp:', err);
        status = 'FAILED';
      }
    }

    return this.prisma.notification.update({
      where: { id: notification.id },
      data: { status },
    });
  }

  async findAll(schoolId: string) {
    return this.prisma.notification.findMany({
      where: { schoolId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findMine(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(userId: string, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    return { success: result.count === 1 };
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true, updated: result.count };
  }

  getPreferences(userId: string) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  updatePreferences(userId: string, dto: UpdateNotificationPreferencesDto) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });
  }
}
