import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { NotificationService } from '../modules/notification/notification.service';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService,
  ) {}

  async hashData(data: string): Promise<string> {
    return bcrypt.hash(data, 10);
  }

  async compareData(data: string, hash: string): Promise<boolean> {
    return bcrypt.compare(data, hash);
  }

  async generateTokens(userId: string, email: string, role: Role, schoolId: string | null) {
    const payload = { sub: userId, email, role, schoolId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'admissionsos_super_secret_jwt_key_12345!',
        expiresIn: (process.env.JWT_ACCESS_EXPIRY || '1h') as any,
      }),
      this.jwtService.signAsync(
        { sub: userId, email },
        {
          secret: process.env.JWT_REFRESH_SECRET || 'admissionsos_super_secret_refresh_key_54321!',
          expiresIn: (process.env.JWT_REFRESH_EXPIRY || '7d') as any,
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  async updateRefreshTokenHash(userId: string, refreshToken: string) {
    const hash = await this.hashData(refreshToken);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash },
    });
  }

  async register(dto: RegisterDto, schoolId: string) {
    // Check if user already exists
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    if (existing) {
      throw new BadRequestException('A user with this email already exists.');
    }

    const passwordHash = await this.hashData(dto.password);

    // Create user as PARENT under the school tenant
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: Role.PARENT,
        schoolId,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.schoolId);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(dto: LoginDto, schoolId: string | undefined) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { mentor: true },
    });

    if (!user || user.status === 'INACTIVE') {
      throw new UnauthorizedException('Invalid credentials or user inactive.');
    }

    // Verify password
    const isPasswordValid = await this.compareData(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const portalRoles: Record<LoginDto['portal'], Role[]> = {
      parent: [Role.PARENT],
      'study-abroad': [Role.PARENT, Role.STUDENT, Role.MENTOR, Role.ALUMNI, Role.SUPER_ADMIN],
      school: [Role.SCHOOL_ADMIN, Role.ADMISSIONS_STAFF],
      'super-admin': [Role.SUPER_ADMIN],
    };

    if (!portalRoles[dto.portal].includes(user.role)) {
      const portalName = dto.portal === 'parent'
        ? 'Parent Portal'
        : dto.portal === 'school'
          ? 'School Portal'
          : dto.portal === 'study-abroad'
            ? 'Study Abroad Portal'
            : 'Super Admin Portal';
      throw new UnauthorizedException(`These credentials are not authorized for the ${portalName}.`);
    }

    // Tenant isolation verification:
    // If not SUPER_ADMIN, ensure they belong to the correct school
    if (user.role !== Role.SUPER_ADMIN && dto.portal !== 'study-abroad') {
      if (!schoolId || user.schoolId !== schoolId) {
        throw new UnauthorizedException('You do not have access to this school tenant.');
      }
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.schoolId);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { mentor: true },
    });

    if (!user || !user.refreshTokenHash || user.status === 'INACTIVE') {
      throw new UnauthorizedException('Access denied.');
    }

    const isMatch = await this.compareData(refreshToken, user.refreshTokenHash);
    if (!isMatch) {
      throw new UnauthorizedException('Access denied.');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.schoolId);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  async requestPasswordReset(email: string, schoolId?: string, portal: 'school' | 'study-abroad' = 'school') {
    if (portal !== 'study-abroad' && !schoolId) {
      throw new BadRequestException('Please select a valid school.');
    }
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
        status: 'ACTIVE',
        ...(portal === 'study-abroad'
          ? { role: { in: [Role.PARENT, Role.STUDENT, Role.MENTOR, Role.ALUMNI] } }
          : { schoolId }),
      },
      include: { school: true },
    });

    let developmentResetUrl: string | undefined;
    if (user) {
      const token = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await this.prisma.$transaction([
        this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
        this.prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } }),
      ]);

      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
      const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
      const accountName = portal === 'study-abroad' ? 'your Pehchaan higher education account' : user.school?.name || 'your school portal';
      const message = `Hello ${user.firstName},<br><br>We received a request to reset your password for ${accountName}.<br><br><a href="${resetUrl}">Reset your password</a><br><br>This secure link expires in 30 minutes and can only be used once. If you did not request this, you can safely ignore this email.`;

      await this.notificationService.sendEmail(user.id, user.email, 'Reset your Pehchaan password', message, user.schoolId || undefined);
      if (process.env.NODE_ENV !== 'production') developmentResetUrl = resetUrl;
    }

    return {
      message: 'If an active account matches those details, a password reset link has been sent.',
      ...(developmentResetUrl ? { developmentResetUrl } : {}),
    };
  }

  async resetPassword(token: string, password: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const resetToken = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
      throw new BadRequestException('This password reset link is invalid or has expired.');
    }

    const passwordHash = await this.hashData(password);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash, refreshTokenHash: null },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Your password has been reset successfully. You can now sign in.' };
  }

  sanitizeUser(user: any) {
    const { passwordHash, refreshTokenHash, ...sanitized } = user;
    return sanitized;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone.trim(),
      },
    });
    return this.sanitizeUser(user);
  }
}
