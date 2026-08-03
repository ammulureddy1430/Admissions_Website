import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../../prisma.service';
import {
  CreateMentorDto,
  BookSessionDto,
  UpdateSessionDto,
  CreateReviewDto,
  SendMessageDto,
  CreateWebinarDto,
  CreateProjectDto,
  UpdateProjectDto,
  SubmitResumeDto,
  ReviewResumeDto,
  UpdatePortfolioDto,
  AddSessionResourceDto,
  CreateAvailabilityDto,
  CreateSessionTaskDto,
  CreateSessionTypeDto,
  CreateMentorResourceDto,
  MentorResourceUploadDto,
  UpdateMentorProfileDto,
} from './dto/mentorship.dto';

@Injectable()
export class MentorshipService {
  private readonly storage = new S3Client({
    region: 'us-east-1',
    endpoint: `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || 9000}`,
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY || 'admin',
      secretAccessKey: process.env.MINIO_SECRET_KEY || 'adminpassword',
    },
    forcePathStyle: true,
  });

  constructor(private readonly prisma: PrismaService) {}

  // --- MENTORS ---
  async getMentors(filters: { search?: string; skill?: string; country?: string; university?: string; verified?: string }) {
    const where: any = {};
    if (filters.verified !== undefined) {
      where.verified = filters.verified === 'true';
    }
    if (filters.country) {
      where.country = filters.country;
    }
    if (filters.university) {
      where.university = filters.university;
    }

    const list = await this.prisma.mentor.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return list.filter((m: any) => {
      let matches = true;
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const fullName = `${m.user.firstName} ${m.user.lastName}`.toLowerCase();
        const bio = m.bio.toLowerCase();
        const company = m.company.toLowerCase();
        const skillsString = (m.skills as string[]).join(' ').toLowerCase();
        matches = fullName.includes(query) || bio.includes(query) || company.includes(query) || skillsString.includes(query);
      }
      if (filters.skill && matches) {
        matches = (m.skills as string[]).includes(filters.skill);
      }
      return matches;
    });
  }

  async getMentorById(id: string) {
    const mentor = await this.prisma.mentor.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        reviews: {
          include: { student: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        availability: true,
      },
    });
    if (!mentor) throw new NotFoundException('Mentor not found.');
    return mentor;
  }

  async getMentorByUserId(userId: string) {
    return this.prisma.mentor.findUnique({ where: { userId } });
  }

  async registerMentor(userId: string, dto: CreateMentorDto) {
    const existing = await this.prisma.mentor.findUnique({ where: { userId } });
    if (existing) throw new BadRequestException('User is already registered as a mentor.');

    return this.prisma.mentor.create({
      data: {
        userId,
        bio: dto.bio,
        position: dto.position,
        company: dto.company,
        university: dto.university,
        country: dto.country,
        yearsExperience: dto.yearsExperience,
        languages: dto.languages,
        skills: dto.skills,
        sessionPrice: dto.sessionPrice,
        about: dto.about,
        education: dto.education,
        experience: dto.experience,
        achievements: dto.achievements,
        research: dto.research || [],
        certifications: dto.certifications || [],
        verified: false,
      },
    });
  }

  async verifyMentor(id: string, verified: boolean) {
    const mentor = await this.prisma.mentor.findUnique({ where: { id } });
    if (!mentor) throw new NotFoundException('Mentor not found.');
    return this.prisma.mentor.update({
      where: { id },
      data: { verified },
    });
  }

  // --- SESSIONS ---
  async bookSession(studentId: string, dto: BookSessionDto) {
    if (dto.time) {
      dto.time = this.convertTo24Hour(dto.time);
    }
    const mentor = await this.prisma.mentor.findUnique({
      where: { id: dto.mentorId },
      include: { sessionTypes: true, availability: true },
    });
    if (!mentor) throw new NotFoundException('Mentor not found.');

    const startsAt = this.resolveSessionStart(dto);
    const sessionType = dto.sessionTypeId
      ? mentor.sessionTypes.find((item) => item.id === dto.sessionTypeId && item.active)
      : undefined;
    if (dto.sessionTypeId && !sessionType) {
      throw new BadRequestException('This session type is not available.');
    }
    const duration = sessionType?.duration ?? dto.duration ?? 30;
    const endsAt = new Date(startsAt.getTime() + duration * 60_000);
    const dayOfWeek = startsAt.toLocaleDateString('en-US', {
      weekday: 'long',
      timeZone: dto.timezone ?? mentor.timezone,
    });
    const time = dto.time ?? startsAt.toISOString().slice(11, 16);
    const isAvailable = mentor.availability.some(
      (slot) =>
        slot.active &&
        ((slot.recurring && slot.dayOfWeek === dayOfWeek) ||
          (slot.slotDate &&
            slot.slotDate.toISOString().slice(0, 10) ===
              startsAt.toISOString().slice(0, 10))) &&
        slot.startTime <= time &&
        slot.endTime >= time,
    );
    if (!isAvailable) {
      throw new BadRequestException('The mentor is not available at this time.');
    }

    const conflict = await this.prisma.session.findFirst({
      where: {
        mentorId: dto.mentorId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
    if (conflict) throw new BadRequestException('Time slot is already reserved.');

    const date = dto.date ?? startsAt.toISOString().slice(0, 10);
    const roomName = `pehchaan-${dto.mentorId.substring(0, 5)}-${date.replace(/[^a-zA-Z0-9]/g, '')}-${time.replace(/[^a-zA-Z0-9]/g, '')}`;
    const meetingLink = `https://meet.jit.si/${roomName}`;

    return this.prisma.$transaction(async (transaction) => {
      const overlapping = await transaction.session.findFirst({
        where: {
          mentorId: dto.mentorId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        select: { id: true },
      });
      if (overlapping) {
        throw new BadRequestException('Time slot is already reserved.');
      }
      return transaction.session.create({
        data: {
          mentorId: dto.mentorId,
          studentId,
          date,
          time,
          startsAt,
          endsAt,
          timezone: dto.timezone ?? mentor.timezone,
          sessionTypeId: sessionType?.id,
          duration,
          priceAmount: sessionType?.priceAmount ?? new Prisma.Decimal(mentor.sessionPrice),
          currency: sessionType?.currency ?? 'INR',
          topic: dto.topic,
          questions: dto.questions || '',
          status: 'PENDING',
          meetingLink,
        },
      });
    });
  }

  async getStudentSessions(studentId: string) {
    return this.prisma.session.findMany({
      where: { studentId },
      include: {
        mentor: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  async getMentorSessions(mentorId: string) {
    return this.prisma.session.findMany({
      where: { mentorId },
      include: {
        student: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { date: 'asc' },
    });
  }

  async updateSession(id: string, userId: string, dto: UpdateSessionDto) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: { mentor: true },
    });
    if (!session) throw new NotFoundException('Session not found.');

    // Only participant can update
    const isStudent = session.studentId === userId;
    const isMentor = session.mentor.userId === userId;
    if (!isStudent && !isMentor) throw new ForbiddenException('You are not a participant in this session.');

    const data: Prisma.SessionUpdateInput = {};
    if (dto.status) data.status = dto.status;
    if (dto.meetingLink && isMentor) data.meetingLink = dto.meetingLink;
    if (dto.reviewRating !== undefined && isStudent) data.reviewRating = dto.reviewRating;
    if (dto.reviewText !== undefined && isStudent) data.reviewText = dto.reviewText;
    if (dto.attendanceStatus && isMentor) data.attendanceStatus = dto.attendanceStatus;
    if (dto.mentorNotes !== undefined && isMentor) data.mentorNotes = dto.mentorNotes;
    if (dto.studentNotes !== undefined && isStudent) data.studentNotes = dto.studentNotes;
    if (dto.status === 'CANCELLED') {
      data.cancellationReason = dto.cancellationReason;
      data.cancelledById = userId;
    }
    if (dto.startsAt) {
      const startsAt = new Date(dto.startsAt);
      data.startsAt = startsAt;
      data.endsAt = new Date(startsAt.getTime() + session.duration * 60_000);
      data.date = startsAt.toISOString().slice(0, 10);
      data.time = startsAt.toISOString().slice(11, 16);
      if (dto.timezone) data.timezone = dto.timezone;
    }

    const updated = await this.prisma.session.update({
      where: { id },
      data,
    });

    if (dto.reviewRating !== undefined) {
      // Recompute mentor avg rating
      const mentorSessions = await this.prisma.session.findMany({
        where: { mentorId: session.mentorId, reviewRating: { not: null } },
      });
      const total = mentorSessions.reduce((acc: number, curr: any) => acc + (curr.reviewRating || 5), 0);
      const avg = mentorSessions.length > 0 ? total / mentorSessions.length : 5.0;
      await this.prisma.mentor.update({
        where: { id: session.mentorId },
        data: { rating: avg },
      });
    }

    return updated;
  }

  // --- REVIEWS ---
  async writeReview(studentId: string, dto: CreateReviewDto) {
    const completedSession = await this.prisma.session.findFirst({
      where: {
        studentId,
        mentorId: dto.mentorId,
        status: 'COMPLETED',
      },
      select: { id: true },
    });
    if (!completedSession) {
      throw new ForbiddenException('A mentor can be reviewed after a completed session.');
    }
    const existing = await this.prisma.review.findFirst({
      where: { studentId, mentorId: dto.mentorId },
    });
    if (existing) throw new BadRequestException('You have already reviewed this mentor.');

    const r = await this.prisma.review.create({
      data: {
        studentId,
        mentorId: dto.mentorId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    // Recompute avg rating
    const reviews = await this.prisma.review.findMany({ where: { mentorId: dto.mentorId } });
    const total = reviews.reduce((acc: number, curr: any) => acc + curr.rating, 0);
    const avg = reviews.length > 0 ? total / reviews.length : 5.0;

    await this.prisma.mentor.update({
      where: { id: dto.mentorId },
      data: { rating: avg },
    });

    return r;
  }

  // --- MESSAGES ---
  async sendMessage(senderId: string, dto: SendMessageDto) {
    if (senderId === dto.recipientId) {
      throw new BadRequestException('You cannot message yourself.');
    }
    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.recipientId },
      select: { id: true },
    });
    if (!recipient) throw new NotFoundException('Message recipient not found.');

    return this.prisma.$transaction(async (transaction) => {
      let conversationId = dto.conversationId;
      if (conversationId) {
        const membership = await transaction.conversationParticipant.findUnique({
          where: {
            conversationId_userId: { conversationId, userId: senderId },
          },
        });
        if (!membership) throw new ForbiddenException('Conversation access denied.');
      } else {
        const existing = await transaction.conversation.findFirst({
          where: {
            kind: 'DIRECT',
            AND: [
              { members: { some: { userId: senderId } } },
              { members: { some: { userId: dto.recipientId } } },
            ],
          },
          select: { id: true },
        });
        conversationId = existing?.id;
      }
      if (!conversationId) {
        const conversation = await transaction.conversation.create({
          data: {
            kind: 'DIRECT',
            members: {
              create: [{ userId: senderId }, { userId: dto.recipientId }],
            },
          },
        });
        conversationId = conversation.id;
      }
      return transaction.message.create({
        data: {
          senderId,
          recipientId: dto.recipientId,
          conversationId,
          text: dto.text,
        },
      });
    });
  }

  async getMessageCandidates(mentorUserId: string) {
    const mentor = await this.prisma.mentor.findUnique({
      where: { userId: mentorUserId },
      select: { id: true },
    });
    if (!mentor) {
      throw new ForbiddenException('Only registered mentors can access assigned candidates.');
    }

    const [sessions, resumes, projects, messages] = await Promise.all([
      this.prisma.session.findMany({
        where: { mentorId: mentor.id },
        select: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              status: true,
              studentProfile: { select: { currentGrade: true } },
            },
          },
          startsAt: true,
          date: true,
          status: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.resumeReview.findMany({
        where: { mentorId: mentor.id },
        select: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              status: true,
              studentProfile: { select: { currentGrade: true } },
            },
          },
        },
      }),
      this.prisma.project.findMany({
        where: { mentorId: mentor.id },
        select: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              status: true,
              studentProfile: { select: { currentGrade: true } },
            },
          },
        },
      }),
      this.prisma.message.findMany({
        where: {
          deletedAt: null,
          OR: [{ senderId: mentorUserId }, { recipientId: mentorUserId }],
        },
        select: {
          senderId: true,
          recipientId: true,
          text: true,
          createdAt: true,
          readAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const candidates = new Map<string, any>();
    for (const item of [...sessions, ...resumes, ...projects]) {
      candidates.set(item.student.id, {
        id: item.student.id,
        name: `${item.student.firstName} ${item.student.lastName}`.trim(),
        email: item.student.email,
        status: item.student.status,
        grade: item.student.studentProfile?.currentGrade ?? null,
        upcomingSession: null,
        lastMessage: null,
        lastMessageAt: null,
        unreadCount: 0,
      });
    }

    for (const session of sessions) {
      const candidate = candidates.get(session.student.id);
      if (
        candidate &&
        !candidate.upcomingSession &&
        ['PENDING', 'CONFIRMED'].includes(session.status)
      ) {
        candidate.upcomingSession = session.startsAt?.toISOString() ?? session.date;
      }
    }

    const partnerIds = new Set(
      messages.map(message =>
        message.senderId === mentorUserId ? message.recipientId : message.senderId,
      ),
    );
    if (partnerIds.size > 0) {
      const partners = await this.prisma.user.findMany({
        where: { id: { in: [...partnerIds] } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
          studentProfile: { select: { currentGrade: true } },
        },
      });
      for (const partner of partners) {
        if (!candidates.has(partner.id)) {
          candidates.set(partner.id, {
            id: partner.id,
            name: `${partner.firstName} ${partner.lastName}`.trim(),
            email: partner.email,
            status: partner.status,
            grade: partner.studentProfile?.currentGrade ?? null,
            upcomingSession: null,
            lastMessage: null,
            lastMessageAt: null,
            unreadCount: 0,
          });
        }
      }
    }

    for (const message of messages) {
      const partnerId =
        message.senderId === mentorUserId ? message.recipientId : message.senderId;
      const candidate = candidates.get(partnerId);
      if (!candidate) continue;
      if (!candidate.lastMessageAt) {
        candidate.lastMessage = message.text;
        candidate.lastMessageAt = message.createdAt;
      }
      if (
        message.recipientId === mentorUserId &&
        message.senderId === partnerId &&
        !message.readAt
      ) {
        candidate.unreadCount += 1;
      }
    }

    return [...candidates.values()].sort((a, b) => {
      if (a.lastMessageAt && b.lastMessageAt) {
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      }
      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  async getMessages(userId: string, partnerId: string) {
    await this.prisma.message.updateMany({
      where: {
        senderId: partnerId,
        recipientId: userId,
        readAt: null,
        deletedAt: null,
      },
      data: { readAt: new Date() },
    });
    return this.prisma.message.findMany({
      where: {
        deletedAt: null,
        OR: [
          { senderId: userId, recipientId: partnerId },
          { senderId: partnerId, recipientId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // --- WEBINARS ---
  async createWebinar(mentorUserId: string, dto: CreateWebinarDto) {
    // Only verified mentors can create
    const mentor = await this.prisma.mentor.findUnique({ where: { userId: mentorUserId } });
    if (!mentor || !mentor.verified) throw new BadRequestException('Unauthorized or unverified mentor.');

    return this.prisma.webinar.create({
      data: {
        title: dto.title,
        host: dto.host,
        type: dto.type,
        time: dto.time,
        meetingLink: dto.meetingLink,
      },
    });
  }

  async getWebinars() {
    return this.prisma.webinar.findMany({ orderBy: { time: 'asc' } });
  }

  async registerWebinar(id: string, userId: string) {
    const webinar = await this.prisma.webinar.findUnique({ where: { id } });
    if (!webinar) throw new NotFoundException('Webinar not found.');
    return this.prisma.webinarRegistration.upsert({
      where: { webinarId_userId: { webinarId: id, userId } },
      create: { webinarId: id, userId },
      update: { status: 'REGISTERED' },
    });
  }

  // --- PROJECTS ---
  async createProject(studentId: string, dto: CreateProjectDto) {
    const milestones = dto.milestones || [
      { label: 'Define project scope & objectives', completed: false },
      { label: 'Research literature / industry solutions', completed: false },
      { label: 'Design prototype / initial framework', completed: false },
      { label: 'Execute building phase / code core logic', completed: false },
      { label: 'Submit to mentor for portfolio review', completed: false },
    ];
    return this.prisma.project.create({
      data: {
        studentId,
        title: dto.title,
        description: dto.description,
        type: dto.type || 'App',
        milestones,
      },
    });
  }

  async getStudentProjects(studentId: string) {
    return this.prisma.project.findMany({ where: { studentId }, orderBy: { createdAt: 'desc' } });
  }

  async getMentorProjects(mentorUserId: string) {
    const mentor = await this.prisma.mentor.findUnique({ where: { userId: mentorUserId } });
    if (!mentor) return [];
    // Mentors can see all projects submitted for mentorship review
    return this.prisma.project.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async updateProject(id: string, userId: string, dto: UpdateProjectDto) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { mentor: { select: { userId: true } } },
    });
    if (!project) throw new NotFoundException('Project not found.');
    if (project.studentId !== userId && project.mentor?.userId !== userId) {
      throw new ForbiddenException('Project access denied.');
    }
    const data: Prisma.ProjectUpdateInput = {};
    if (dto.status) data.status = dto.status;
    if (dto.milestones) data.milestones = dto.milestones;
    return this.prisma.project.update({ where: { id }, data });
  }

  async deleteProject(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });
    if (!project) throw new NotFoundException('Project not found.');
    if (project.studentId !== userId) {
      throw new ForbiddenException('Project access denied.');
    }
    return this.prisma.project.delete({ where: { id } });
  }


  // --- RESUMES ---
  async submitResume(studentId: string, dto: SubmitResumeDto) {
    const mentor = await this.prisma.mentor.findUnique({ where: { id: dto.mentorId } });
    if (!mentor) throw new NotFoundException('Mentor not found.');

    return this.prisma.resumeReview.create({
      data: {
        studentId,
        mentorId: dto.mentorId,
        resumeUrl: dto.resumeUrl,
        status: 'SUBMITTED',
      },
    });
  }

  async getStudentResumes(studentId: string) {
    return this.prisma.resumeReview.findMany({
      where: { studentId },
      include: {
        mentor: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMentorResumes(mentorUserId: string) {
    const mentor = await this.prisma.mentor.findUnique({ where: { userId: mentorUserId } });
    if (!mentor) return [];
    return this.prisma.resumeReview.findMany({
      where: { mentorId: mentor.id },
      include: {
        student: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewResume(id: string, mentorUserId: string, dto: ReviewResumeDto) {
    const resume = await this.prisma.resumeReview.findUnique({
      where: { id },
      include: { mentor: { select: { userId: true } } },
    });
    if (!resume) throw new NotFoundException('Review request not found.');
    if (resume.mentor.userId !== mentorUserId) {
      throw new ForbiddenException('Review request access denied.');
    }
    return this.prisma.resumeReview.update({
      where: { id },
      data: {
        status: 'REVIEWED',
        score: dto.score,
        suggestions: dto.suggestions,
        tips: dto.tips,
      },
    });
  }

  // --- PORTFOLIOS ---
  async getPortfolio(studentId: string) {
    return this.prisma.portfolio.findUnique({ where: { studentId } });
  }

  async getPortfolioByPublicUrl(publicUrl: string) {
    const pf = await this.prisma.portfolio.findUnique({
      where: { publicUrl },
      include: {
        student: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    if (!pf) throw new NotFoundException('Portfolio not found.');
    return pf;
  }

  async updatePortfolio(studentId: string, dto: UpdatePortfolioDto) {
    const existing = await this.prisma.portfolio.findUnique({ where: { studentId } });
    if (existing) {
      return this.prisma.portfolio.update({
        where: { studentId },
        data: {
          bio: dto.bio,
          websiteUrl: dto.websiteUrl,
          skills: dto.skills,
        },
      });
    }

    const publicUrl = `pf-${studentId.substring(0, 6)}-${Math.random().toString(36).substring(2, 6)}`;
    return this.prisma.portfolio.create({
      data: {
        studentId,
        bio: dto.bio,
        websiteUrl: dto.websiteUrl,
        skills: dto.skills,
        publicUrl,
      },
    });
  }

  // --- ADVISORIES (Careers & Scholarships from Database) ---
  async getCareers() {
    return this.prisma.careerPath.findMany({ orderBy: { title: 'asc' } });
  }

  async getCareerById(id: string) {
    const c = await this.prisma.careerPath.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Career not found.');
    return c;
  }

  async getScholarships(filters: { search?: string; country?: string }) {
    const where: any = {};
    if (filters.country) {
      where.country = { contains: filters.country };
    }
    const list = await this.prisma.scholarship.findMany({ where, orderBy: { name: 'asc' } });
    if (filters.search) {
      const q = filters.search.toLowerCase();
      return list.filter((s: any) => s.name.toLowerCase().includes(q) || s.eligibility.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
    }
    return list;
  }

  // --- DASHBOARDS ---
  async getStudentDashboard(studentId: string) {
    const upcomingSessions = await this.prisma.session.findMany({
      where: { studentId, status: { in: ['PENDING', 'CONFIRMED'] } },
      include: {
        mentor: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { date: 'asc' },
    });

    const pastSessions = await this.prisma.session.findMany({
      where: { studentId, status: 'COMPLETED' },
      include: {
        mentor: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { date: 'desc' },
    });

    const projects = await this.getStudentProjects(studentId);
    const resumes = await this.getStudentResumes(studentId);
    const portfolio = await this.getPortfolio(studentId);

    return {
      upcomingSessions,
      pastSessions,
      projects,
      resumes,
      portfolio,
    };
  }

  async getMentorDashboard(mentorUserId: string) {
    const mentor = await this.prisma.mentor.findUnique({ where: { userId: mentorUserId } });
    if (!mentor) throw new NotFoundException('User is not registered as a mentor.');

    const pendingSessions = await this.prisma.session.findMany({
      where: { mentorId: mentor.id, status: 'PENDING' },
      include: { student: { select: { id: true, firstName: true, lastName: true, email: true, studentProfile: { select: { currentGrade: true } } } } },
      orderBy: { date: 'asc' },
    });

    const upcomingSessions = await this.prisma.session.findMany({
      where: { mentorId: mentor.id, status: 'CONFIRMED' },
      include: { student: { select: { id: true, firstName: true, lastName: true, email: true, studentProfile: { select: { currentGrade: true } } } } },
      orderBy: { date: 'asc' },
    });

    const allSessions = await this.prisma.session.findMany({
      where: { mentorId: mentor.id },
      include: { student: { select: { id: true, firstName: true, lastName: true, email: true, studentProfile: { select: { currentGrade: true } } } } },
      orderBy: { date: 'desc' },
    });

    const resumes = await this.getMentorResumes(mentorUserId);
    const projects = await this.getMentorProjects(mentorUserId);

    const candidateIds = new Set<string>([
      ...allSessions.map(session => session.studentId),
      ...resumes.map((resume: any) => resume.studentId),
      ...projects.map((project: any) => project.studentId),
    ]);
    const candidates = await this.prisma.user.findMany({
      where: { id: { in: [...candidateIds] } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        studentProfile: { select: { currentGrade: true } },
      },
    });
    const candidateProgress = candidates.map(candidate => {
      const candidateSessions = allSessions.filter(session => session.studentId === candidate.id);
      const candidateResumes = resumes.filter((resume: any) => resume.studentId === candidate.id);
      const candidateProjects = projects.filter((project: any) => project.studentId === candidate.id);
      const totalActivities =
        candidateSessions.length + candidateResumes.length + candidateProjects.length;
      const completedActivities =
        candidateSessions.filter(session => session.status === 'COMPLETED').length +
        candidateResumes.filter((resume: any) => resume.status === 'REVIEWED').length +
        candidateProjects.filter((project: any) => project.status === 'COMPLETED').length;
      const nextSession = candidateSessions.find(session =>
        ['PENDING', 'CONFIRMED'].includes(session.status),
      );
      return {
        id: candidate.id,
        name: `${candidate.firstName} ${candidate.lastName}`.trim(),
        email: candidate.email,
        detail: candidate.studentProfile?.currentGrade ?? candidate.status,
        progress: totalActivities
          ? Math.max(10, Math.round((completedActivities / totalActivities) * 100))
          : 0,
        completedActivities,
        totalActivities,
        stage: nextSession
          ? nextSession.status === 'CONFIRMED'
            ? 'Session scheduled'
            : 'Awaiting confirmation'
          : completedActivities
            ? 'Mentorship in progress'
            : 'Newly assigned',
      };
    });

    const completed = allSessions.filter(session => session.status === 'COMPLETED');
    const earnings = completed.reduce(
      (sum, session) => sum + (session.priceAmount ? Number(session.priceAmount) : mentor.sessionPrice),
      0,
    );
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyEarnings = completed
      .filter(session => (session.endsAt ?? session.startsAt ?? session.updatedAt) >= monthStart)
      .reduce(
        (sum, session) => sum + (session.priceAmount ? Number(session.priceAmount) : mentor.sessionPrice),
        0,
      );
    const concluded = allSessions.filter(session =>
      ['COMPLETED', 'CANCELLED'].includes(session.status),
    );
    const successRate = concluded.length
      ? Math.round((completed.length / concluded.length) * 100)
      : 0;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const activeThisWeek = new Set(
      allSessions
        .filter(session => session.updatedAt >= weekStart)
        .map(session => session.studentId),
    ).size;

    return {
      pendingSessions,
      upcomingSessions,
      allSessions,
      resumes,
      projects,
      earnings,
      candidateProgress,
      metrics: {
        assignedStudents: candidateIds.size,
        activeThisWeek,
        upcomingSessions: pendingSessions.length + upcomingSessions.length,
        successRate,
        monthlyEarnings,
      },
      generatedAt: now.toISOString(),
    };
  }

  async getMentorAnalytics(mentorUserId: string) {
    const mentor = await this.prisma.mentor.findUnique({
      where: { userId: mentorUserId },
      select: { id: true, rating: true },
    });
    if (!mentor) throw new NotFoundException('User is not registered as a mentor.');

    const [sessions, resumes, projects, reviews] = await Promise.all([
      this.prisma.session.findMany({
        where: { mentorId: mentor.id },
        select: {
          studentId: true,
          status: true,
          createdAt: true,
          startsAt: true,
        },
      }),
      this.prisma.resumeReview.findMany({
        where: { mentorId: mentor.id },
        select: { studentId: true, status: true, createdAt: true },
      }),
      this.prisma.project.findMany({
        where: { mentorId: mentor.id },
        select: { studentId: true, status: true, createdAt: true },
      }),
      this.prisma.review.findMany({
        where: { mentorId: mentor.id },
        select: { rating: true, createdAt: true },
      }),
    ]);

    const candidateIds = new Set<string>([
      ...sessions.map(item => item.studentId),
      ...resumes.map(item => item.studentId),
      ...projects.map(item => item.studentId),
    ]);
    const messages = candidateIds.size
      ? await this.prisma.message.findMany({
          where: {
            deletedAt: null,
            OR: [
              { senderId: mentorUserId, recipientId: { in: [...candidateIds] } },
              { recipientId: mentorUserId, senderId: { in: [...candidateIds] } },
            ],
          },
          select: { senderId: true, recipientId: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    const responseMinutes: number[] = [];
    for (let index = 0; index < messages.length; index += 1) {
      const incoming = messages[index];
      if (incoming.recipientId !== mentorUserId) continue;
      for (let next = index + 1; next < messages.length; next += 1) {
        const candidateResponse = messages[next];
        if (
          candidateResponse.senderId === mentorUserId &&
          candidateResponse.recipientId === incoming.senderId
        ) {
          responseMinutes.push(
            (candidateResponse.createdAt.getTime() - incoming.createdAt.getTime()) / 60000,
          );
          break;
        }
        if (
          candidateResponse.senderId === incoming.senderId &&
          candidateResponse.recipientId === mentorUserId
        ) {
          break;
        }
      }
    }
    responseMinutes.sort((a, b) => a - b);
    const medianResponseMinutes = responseMinutes.length
      ? responseMinutes.length % 2
        ? responseMinutes[Math.floor(responseMinutes.length / 2)]
        : (responseMinutes[responseMinutes.length / 2 - 1] +
            responseMinutes[responseMinutes.length / 2]) /
          2
      : null;

    const now = new Date();
    const monthlyActivity = Array.from({ length: 6 }, (_, offset) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - offset), 1);
      const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      const monthSessions = sessions.filter(session => {
        const timestamp = session.startsAt ?? session.createdAt;
        return timestamp >= date && timestamp < nextMonth;
      });
      return {
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        booked: monthSessions.length,
        completed: monthSessions.filter(session => session.status === 'COMPLETED').length,
      };
    });

    const sessionStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map(
      status => ({
        status,
        count: sessions.filter(session => session.status === status).length,
      }),
    );
    const completedReviews = resumes.filter(resume => resume.status === 'REVIEWED').length;
    const averageRating = reviews.length
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : mentor.rating;

    return {
      generatedAt: now.toISOString(),
      metrics: {
        studentsGuided: candidateIds.size,
        reviewsCompleted: completedReviews,
        averageRating: Number(averageRating.toFixed(1)),
        ratingCount: reviews.length,
        medianResponseMinutes:
          medianResponseMinutes === null ? null : Math.round(medianResponseMinutes),
        completedSessions: sessions.filter(session => session.status === 'COMPLETED').length,
        totalSessions: sessions.length,
        activeProjects: projects.filter(project => project.status === 'IN_PROGRESS').length,
      },
      monthlyActivity,
      sessionStatuses,
    };
  }

  async getMentorEarnings(mentorUserId: string) {
    const mentor = await this.prisma.mentor.findUnique({
      where: { userId: mentorUserId },
      select: { id: true, sessionPrice: true },
    });
    if (!mentor) throw new NotFoundException('User is not registered as a mentor.');

    const sessions = await this.prisma.session.findMany({
      where: { mentorId: mentor.id, status: 'COMPLETED' },
      include: {
        student: {
          select: { firstName: true, lastName: true, email: true },
        },
        sessionType: {
          select: { title: true },
        },
      },
      orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
    });

    const entries = sessions.map(session => {
      const amount = session.priceAmount
        ? Number(session.priceAmount)
        : mentor.sessionPrice;
      return {
        id: session.id,
        earnedAt: (session.endsAt ?? session.startsAt ?? session.updatedAt).toISOString(),
        service: session.sessionType?.title || session.topic,
        student: `${session.student.firstName} ${session.student.lastName}`.trim(),
        studentEmail: session.student.email,
        duration: session.duration,
        amount,
        currency: session.currency,
        status: 'EARNED',
      };
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const totalsByCurrency = entries.reduce<Record<string, number>>((totals, entry) => {
      totals[entry.currency] = (totals[entry.currency] ?? 0) + entry.amount;
      return totals;
    }, {});
    const currentMonthByCurrency = entries
      .filter(entry => new Date(entry.earnedAt) >= monthStart)
      .reduce<Record<string, number>>((totals, entry) => {
        totals[entry.currency] = (totals[entry.currency] ?? 0) + entry.amount;
        return totals;
      }, {});

    const monthly = Array.from({ length: 6 }, (_, offset) => {
      const start = new Date(now.getFullYear(), now.getMonth() - (5 - offset), 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      const monthEntries = entries.filter(entry => {
        const earnedAt = new Date(entry.earnedAt);
        return earnedAt >= start && earnedAt < end;
      });
      return {
        month: start.toLocaleDateString('en-US', { month: 'short' }),
        amount: monthEntries
          .filter(entry => entry.currency === 'INR')
          .reduce((sum, entry) => sum + entry.amount, 0),
        sessions: monthEntries.length,
      };
    });

    return {
      generatedAt: now.toISOString(),
      totalsByCurrency,
      currentMonthByCurrency,
      completedSessionCount: entries.length,
      entries,
      monthly,
      note: 'Earnings are recognized when a mentorship session is marked COMPLETED.',
    };
  }

  async getOwnMentorProfile(userId: string) {
    const mentor = await this.prisma.mentor.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });
    if (!mentor) throw new NotFoundException('User is not registered as a mentor.');
    return mentor;
  }

  async updateOwnMentorProfile(userId: string, dto: UpdateMentorProfileDto) {
    const mentor = await this.requireMentorUser(userId);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(dto.firstName !== undefined && { firstName: dto.firstName.trim() }),
          ...(dto.lastName !== undefined && { lastName: dto.lastName.trim() }),
        },
      }),
      this.prisma.mentor.update({
        where: { id: mentor.id },
        data: {
          ...(dto.headline !== undefined && { headline: dto.headline.trim() || null }),
          ...(dto.position !== undefined && { position: dto.position.trim() }),
          ...(dto.company !== undefined && { company: dto.company.trim() }),
          ...(dto.university !== undefined && { university: dto.university.trim() }),
          ...(dto.country !== undefined && { country: dto.country.trim() }),
          ...(dto.timezone !== undefined && { timezone: dto.timezone.trim() }),
          ...(dto.yearsExperience !== undefined && { yearsExperience: dto.yearsExperience }),
          ...(dto.sessionPrice !== undefined && { sessionPrice: dto.sessionPrice }),
          ...(dto.bio !== undefined && { bio: dto.bio.trim() }),
          ...(dto.about !== undefined && { about: dto.about.trim() }),
          ...(dto.languages !== undefined && { languages: dto.languages }),
          ...(dto.skills !== undefined && { skills: dto.skills }),
          ...(dto.targetDestinations !== undefined && {
            targetDestinations: dto.targetDestinations,
          }),
        },
      }),
    ]);
    return this.getOwnMentorProfile(userId);
  }

  async getMentorStudentProfile(mentorUserId: string, studentId: string) {
    const mentor = await this.requireMentorUser(mentorUserId);
    const [sessionCount, resumeCount, projectCount] = await Promise.all([
      this.prisma.session.count({ where: { mentorId: mentor.id, studentId } }),
      this.prisma.resumeReview.count({ where: { mentorId: mentor.id, studentId } }),
      this.prisma.project.count({ where: { mentorId: mentor.id, studentId } }),
    ]);
    if (sessionCount + resumeCount + projectCount === 0) {
      throw new ForbiddenException('This student is not assigned to you.');
    }

    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        studentProfile: {
          select: {
            dob: true,
            gender: true,
            currentGrade: true,
            previousSchool: true,
          },
        },
      },
    });
    if (!student) throw new NotFoundException('Student not found.');

    const [sessions, resumes, projects] = await Promise.all([
      this.prisma.session.findMany({
        where: { mentorId: mentor.id, studentId },
        select: {
          id: true,
          topic: true,
          status: true,
          date: true,
          time: true,
          startsAt: true,
          duration: true,
          attendanceStatus: true,
        },
        orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.resumeReview.findMany({
        where: { mentorId: mentor.id, studentId },
        select: {
          id: true,
          status: true,
          score: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.project.findMany({
        where: { mentorId: mentor.id, studentId },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          category: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalActivities = sessions.length + resumes.length + projects.length;
    const completedActivities =
      sessions.filter(item => item.status === 'COMPLETED').length +
      resumes.filter(item => item.status === 'REVIEWED').length +
      projects.filter(item => item.status === 'COMPLETED').length;

    return {
      student,
      progress: {
        totalActivities,
        completedActivities,
        percent: totalActivities
          ? Math.max(10, Math.round((completedActivities / totalActivities) * 100))
          : 0,
      },
      sessions,
      resumes,
      projects,
    };
  }

  async followMentor(userId: string, mentorId: string) {
    await this.requireMentor(mentorId);
    return this.prisma.mentorFollow.upsert({
      where: { userId_mentorId: { userId, mentorId } },
      create: { userId, mentorId },
      update: {},
    });
  }

  async unfollowMentor(userId: string, mentorId: string) {
    await this.prisma.mentorFollow.deleteMany({ where: { userId, mentorId } });
    return { success: true };
  }

  async saveMentor(userId: string, mentorId: string) {
    await this.requireMentor(mentorId);
    return this.prisma.savedMentor.upsert({
      where: { userId_mentorId: { userId, mentorId } },
      create: { userId, mentorId },
      update: {},
    });
  }

  async unsaveMentor(userId: string, mentorId: string) {
    await this.prisma.savedMentor.deleteMany({ where: { userId, mentorId } });
    return { success: true };
  }

  async createSessionType(userId: string, dto: CreateSessionTypeDto) {
    const mentor = await this.requireMentorUser(userId);
    return this.prisma.mentorSessionType.create({
      data: {
        mentorId: mentor.id,
        title: dto.title,
        description: dto.description,
        duration: dto.duration,
        priceAmount: dto.priceAmount,
        currency: dto.currency ?? 'INR',
      },
    });
  }

  async createAvailability(userId: string, dto: CreateAvailabilityDto) {
    const mentor = await this.requireMentorUser(userId);
    if (!dto.dayOfWeek && !dto.slotDate) {
      throw new BadRequestException('Provide a recurring day or a specific date.');
    }
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('Availability end time must be after start time.');
    }
    return this.prisma.availabilitySlot.create({
      data: {
        mentorId: mentor.id,
        dayOfWeek: dto.dayOfWeek ?? new Date(dto.slotDate!).toLocaleDateString('en-US', { weekday: 'long' }),
        startTime: dto.startTime,
        endTime: dto.endTime,
        timezone: dto.timezone ?? mentor.timezone,
        slotDate: dto.slotDate ? new Date(dto.slotDate) : undefined,
        recurring: dto.recurring ?? !dto.slotDate,
      },
    });
  }

  async addSessionResource(id: string, userId: string, dto: AddSessionResourceDto) {
    await this.requireSessionParticipant(id, userId);
    return this.prisma.sessionResource.create({
      data: { sessionId: id, title: dto.title, url: dto.url, type: dto.type },
    });
  }

  async getMentorResources(userId: string) {
    const mentor = await this.requireMentorUser(userId);
    return this.prisma.mentorResource.findMany({
      where: { mentorId: mentor.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMentorResourceUpload(userId: string, dto: MentorResourceUploadDto) {
    const mentor = await this.requireMentorUser(userId);
    const safeName = dto.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `mentor-resources/${mentor.id}/${Date.now()}_${safeName}`;
    const bucket = process.env.MINIO_BUCKET || 'admissionsos';
    await this.ensureResourceBucket(bucket);
    const uploadUrl = await getSignedUrl(
      this.storage,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: dto.contentType,
      }),
      { expiresIn: 900 },
    );
    const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
    const port = process.env.MINIO_PORT || 9000;
    return {
      uploadUrl,
      resourceUrl: `http://${endpoint}:${port}/${bucket}/${key}`,
    };
  }

  private async ensureResourceBucket(bucket: string) {
    try {
      await this.storage.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch (error: any) {
      const status = error?.$metadata?.httpStatusCode;
      if (status !== 404 && error?.name !== 'NotFound' && error?.Code !== 'NoSuchBucket') {
        throw error;
      }
      await this.storage.send(new CreateBucketCommand({ Bucket: bucket }));
    }
  }

  async createMentorResource(userId: string, dto: CreateMentorResourceDto) {
    const mentor = await this.requireMentorUser(userId);
    return this.prisma.mentorResource.create({
      data: {
        mentorId: mentor.id,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        url: dto.url,
      },
    });
  }

  async publishMentorResource(userId: string, id: string, published: boolean) {
    const mentor = await this.requireMentorUser(userId);
    const resource = await this.prisma.mentorResource.findFirst({
      where: { id, mentorId: mentor.id },
    });
    if (!resource) throw new NotFoundException('Resource not found.');
    return this.prisma.mentorResource.update({
      where: { id },
      data: { published },
    });
  }

  async getMentorResourceDownload(userId: string, id: string) {
    const mentor = await this.requireMentorUser(userId);
    const resource = await this.prisma.mentorResource.findFirst({
      where: { id, mentorId: mentor.id },
    });
    if (!resource) throw new NotFoundException('Resource not found.');
    const bucket = process.env.MINIO_BUCKET || 'admissionsos';
    const marker = `/${bucket}/`;
    const key = resource.url.includes(marker)
      ? resource.url.slice(resource.url.indexOf(marker) + marker.length)
      : null;
    if (!key) throw new BadRequestException('Resource storage path is invalid.');
    const downloadUrl = await getSignedUrl(
      this.storage,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ResponseContentDisposition: `attachment; filename="${resource.title.replace(/"/g, '')}"`,
      }),
      { expiresIn: 300 },
    );
    return { downloadUrl };
  }

  async deleteMentorResource(userId: string, id: string) {
    const mentor = await this.requireMentorUser(userId);
    const resource = await this.prisma.mentorResource.findFirst({
      where: { id, mentorId: mentor.id },
    });
    if (!resource) throw new NotFoundException('Resource not found.');

    const bucket = process.env.MINIO_BUCKET || 'admissionsos';
    const marker = `/${bucket}/`;
    const key = resource.url.includes(marker)
      ? resource.url.slice(resource.url.indexOf(marker) + marker.length)
      : null;
    if (key) {
      await this.ensureResourceBucket(bucket);
      await this.storage.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    }
    await this.prisma.mentorResource.delete({ where: { id } });
    return { success: true };
  }

  async addSessionTask(id: string, userId: string, dto: CreateSessionTaskDto) {
    await this.requireSessionParticipant(id, userId);
    return this.prisma.sessionTask.create({
      data: {
        sessionId: id,
        title: dto.title,
        description: dto.description,
        assigneeId: dto.assigneeId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
    });
  }

  private resolveSessionStart(dto: BookSessionDto) {
    const value = dto.startsAt ?? (dto.date && dto.time ? `${dto.date}T${dto.time}:00` : undefined);
    if (!value) throw new BadRequestException('A session start date and time are required.');
    const startsAt = new Date(value);
    if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
      throw new BadRequestException('Choose a valid future session time.');
    }
    return startsAt;
  }

  private async requireMentor(mentorId: string) {
    const mentor = await this.prisma.mentor.findUnique({ where: { id: mentorId } });
    if (!mentor) throw new NotFoundException('Mentor not found.');
    return mentor;
  }

  private async requireMentorUser(userId: string) {
    const mentor = await this.prisma.mentor.findUnique({ where: { userId } });
    if (!mentor) throw new ForbiddenException('A mentor profile is required.');
    return mentor;
  }

  private async requireSessionParticipant(id: string, userId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: { mentor: { select: { userId: true } } },
    });
    if (!session) throw new NotFoundException('Session not found.');
    if (session.studentId !== userId && session.mentor.userId !== userId) {
      throw new ForbiddenException('Session access denied.');
    }
    return session;
  }

  private convertTo24Hour(time12h: string): string {
    const match = time12h.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return time12h;
    const [_, hoursStr, minutesStr, modifier] = match;
    let hours = parseInt(hoursStr, 10);
    if (modifier.toUpperCase() === 'PM' && hours < 12) {
      hours += 12;
    }
    if (modifier.toUpperCase() === 'AM' && hours === 12) {
      hours = 0;
    }
    return `${String(hours).padStart(2, '0')}:${minutesStr}`;
  }
}
