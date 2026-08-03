import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class EmailWorkflowService {
  private readonly legacyDefaultSubject = 'Congratulations! Your Child Has Been Selected for Admission';
  private readonly defaultSubject = 'Congratulations! Your Child Has Been Selected for Admission to {{SchoolName}}';

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  // Get active templates for a school, auto-seeding a default one if none exists
  async getTemplates(schoolId: string) {
    await this.prisma.emailTemplate.updateMany({
      where: {
        schoolId,
        name: 'Default Admission Offer Letter Template',
        subject: this.legacyDefaultSubject,
      },
      data: { subject: this.defaultSubject },
    });

    const templates = await this.prisma.emailTemplate.findMany({
      where: { schoolId, isArchived: false },
      orderBy: { createdAt: 'asc' },
    });

    if (templates.length === 0) {
      const defaultTemplate = await this.prisma.emailTemplate.create({
        data: {
          schoolId,
          name: 'Default Admission Offer Letter Template',
          subject: this.defaultSubject,
          body: `Dear {{ParentName}},\n\nWe are thrilled to inform you that your child, {{StudentName}}, has been selected for admission to {{Grade}} at {{SchoolName}} for the academic year {{AcademicYear}}.\n\nApplication details:\n- Application Number: {{ApplicationNumber}}\n- Selected Grade: {{Grade}}\n- Admission Offer Date: {{AdmissionDate}}\n- Joining Date: {{JoiningDate}}\n\nPlease complete the enrollment steps by paying the admission fees before the deadline: {{FeeDeadline}}.\n\nShould you have any questions, feel free to reply directly to this email.\n\nWarm regards,\nAdmissions Office,\n{{SchoolName}}`,
        },
      });
      return [defaultTemplate];
    }

    return templates;
  }

  // Create a new template or new version of an existing one
  async createTemplate(schoolId: string, name: string, subject: string, body: string) {
    return this.prisma.emailTemplate.create({
      data: { schoolId, name, subject, body },
    });
  }

  // Fetch email draft for an application, auto-generating it from the default template if none exists
  async getDraft(applicationId: string, schoolId: string) {
    let draft = await this.prisma.emailDraft.findUnique({
      where: { applicationId },
      include: { attachments: true },
    });

    if (!draft) {
      const application = await this.prisma.application.findFirst({
        where: { id: applicationId, schoolId },
        include: { parent: true },
      });

      if (!application) {
        throw new NotFoundException('Application not found');
      }

      const templates = await this.getTemplates(schoolId);
      const template = templates[0];

      const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
      const parentName = application.parent ? `${application.parent.firstName} ${application.parent.lastName}` : 'Parent/Guardian';
      const studentName = `${application.studentFirstName} ${application.studentLastName}`;
      const schoolName = school?.name || 'School';
      const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      const joiningDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      const feeDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      const appNumber = application.id.substring(0, 8).toUpperCase();

      const compiledSubject = template.subject.replaceAll('{{SchoolName}}', schoolName);
      const compiledBody = template.body
        .replaceAll('{{ParentName}}', parentName)
        .replaceAll('{{StudentName}}', studentName)
        .replaceAll('{{Grade}}', application.grade || 'Grade 1')
        .replaceAll('{{SchoolName}}', schoolName)
        .replaceAll('{{AcademicYear}}', '2026-2027')
        .replaceAll('{{ApplicationNumber}}', appNumber)
        .replaceAll('{{AdmissionDate}}', today)
        .replaceAll('{{JoiningDate}}', joiningDate)
        .replaceAll('{{FeeDeadline}}', feeDeadline);

      draft = await this.prisma.emailDraft.create({
        data: {
          applicationId,
          subject: compiledSubject,
          body: compiledBody,
        },
        include: { attachments: true },
      });
      if (!draft) throw new Error('Failed to create email draft');

      const draftId = draft.id;

      // Initialize default attachments
      const defaultAttachments = [
        { name: 'Admission Letter PDF', url: `http://localhost:5001/application/${application.id}/admission-letter`, type: 'PDF' },
        { name: 'Fee Structure PDF', url: 'http://localhost:5001/assets/documents/fee-structure.pdf', type: 'PDF' },
        { name: 'School Brochure', url: 'http://localhost:5001/assets/documents/school-brochure.pdf', type: 'PDF' },
        { name: 'Document Checklist', url: 'http://localhost:5001/assets/documents/document-checklist.pdf', type: 'PDF' },
        { name: 'Welcome Letter', url: 'http://localhost:5001/assets/documents/welcome-letter.pdf', type: 'PDF' },
      ];

      await Promise.all(
        defaultAttachments.map((att) =>
          this.prisma.emailAttachment.create({
            data: {
              name: att.name,
              url: att.url,
              type: att.type,
              draftId,
            },
          }),
        ),
      );

      // Re-query draft to get updated attachments
      draft = await this.prisma.emailDraft.findUnique({
        where: { applicationId },
        include: { attachments: true },
      });
    }

    if (draft?.subject === this.legacyDefaultSubject) {
      const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
      if (school) {
        draft = await this.prisma.emailDraft.update({
          where: { id: draft.id },
          data: { subject: `${this.legacyDefaultSubject} to ${school.name}` },
          include: { attachments: true },
        });
      }
    }

    return draft;
  }

  // Update draft content
  async updateDraft(
    applicationId: string,
    subject: string,
    body: string,
    attachments: { name: string; url: string; type: string; selected: boolean }[],
    adminId: string,
    schoolId: string,
  ) {
    const draft = await this.getDraft(applicationId, schoolId);
    if (!draft) throw new NotFoundException('Draft not found');

    await this.prisma.emailDraft.update({
      where: { id: draft.id },
      data: {
        subject,
        body,
        lastEditedById: adminId,
      },
    });

    // Delete existing attachments on draft and recreate based on selections
    await this.prisma.emailAttachment.deleteMany({
      where: { draftId: draft.id },
    });

    if (attachments && attachments.length > 0) {
      await Promise.all(
        attachments
          .filter((a) => a.selected)
          .map((a) =>
            this.prisma.emailAttachment.create({
              data: {
                name: a.name,
                url: a.url,
                type: a.type,
                draftId: draft.id,
              },
            }),
          ),
      );
    }

    return this.prisma.emailDraft.findUnique({
      where: { id: draft.id },
      include: { attachments: true },
    });
  }

  // Replace placeholders dynamically with actual student details
  async compileTemplate(applicationId: string, subjectTemplate: string, bodyTemplate: string, schoolId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, schoolId },
      include: { parent: true, school: true },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Resolve current academic year or default to 2026-2027
    const currentYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });
    const academicYearName = currentYear ? currentYear.name : '2026-2027';

    const replacements: Record<string, string> = {
      '{{StudentName}}': `${application.studentFirstName} ${application.studentLastName}`,
      '{{ParentName}}': `${application.parent.firstName} ${application.parent.lastName}`,
      '{{Grade}}': application.grade,
      '{{SchoolName}}': application.school.name,
      '{{AcademicYear}}': academicYearName,
      '{{ApplicationNumber}}': application.id.substring(0, 8),
      '{{AdmissionDate}}': new Date().toLocaleDateString('en-IN'),
      '{{FeeDeadline}}': new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN'),
      '{{JoiningDate}}': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN'),
    };

    let compiledSubject = subjectTemplate;
    let compiledBody = bodyTemplate;

    for (const [placeholder, val] of Object.entries(replacements)) {
      compiledSubject = compiledSubject.replaceAll(placeholder, val);
      compiledBody = compiledBody.replaceAll(placeholder, val);
    }

    return {
      studentName: `${application.studentFirstName} ${application.studentLastName}`,
      applicationNumber: application.id.substring(0, 8),
      grade: application.grade,
      parentName: `${application.parent.firstName} ${application.parent.lastName}`,
      parentEmail: application.parent.email,
      schoolName: application.school.name,
      academicYear: academicYearName,
      subject: compiledSubject,
      body: compiledBody,
    };
  }

  // Previews the email template variables compiled
  async preview(applicationId: string, subject: string, body: string, schoolId: string) {
    return this.compileTemplate(applicationId, subject, body, schoolId);
  }

  // Sends the email, updates application status to "SELECTED", creates history logs, and triggers mock tracking
  async sendEmail(
    applicationId: string,
    subject: string,
    body: string,
    adminId: string,
    schoolId: string,
  ) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, schoolId },
      include: { parent: true },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const parentEmail = application.parent.email;
    if (!parentEmail) {
      throw new BadRequestException('Parent email is missing');
    }

    // Compile variables
    const compiled = await this.compileTemplate(applicationId, subject, body, schoolId);

    // Call Notification Service to simulate actual send
    const notification = await this.notificationService.sendEmail(
      application.parentId,
      parentEmail,
      compiled.subject,
      compiled.body,
      schoolId,
    );

    // Fetch attachments from the current draft
    const draft = await this.getDraft(applicationId, schoolId);
    if (!draft) throw new NotFoundException('Draft not found');

    // Create EmailHistory log
    const history = await this.prisma.emailHistory.create({
      data: {
        applicationId,
        subject: compiled.subject,
        body: compiled.body,
        status: 'SENT',
        sentById: adminId,
        messageId: `msg-${Math.random().toString(36).substring(2, 9)}`,
        emailId: notification.id,
      },
    });

    // Copy draft attachments to history attachments
    if (draft.attachments && draft.attachments.length > 0) {
      await Promise.all(
        draft.attachments.map((att) =>
          this.prisma.emailAttachment.create({
            data: {
              name: att.name,
              url: att.url,
              type: att.type,
              historyId: history.id,
            },
          }),
        ),
      );
    }

    // Save Email Log
    await this.prisma.emailLog.create({
      data: {
        historyId: history.id,
        status: 'SENT',
      },
    });

    // Update Application status and emailStatus
    await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: 'SELECTED',
        emailStatus: 'SENT',
      },
    });

    // Clean up draft after sending
    await this.prisma.emailDraft.delete({
      where: { id: draft.id },
    });

    // Trigger mock delivery and open simulation asynchronously (non-blocking)
    this.runSimulatedTracking(history.id, parentEmail);

    return {
      success: true,
      historyId: history.id,
      emailId: notification.id,
      status: 'SENT',
    };
  }

  // Resend previously sent offer email
  async resendEmail(historyId: string, adminId: string, schoolId: string) {
    const prevHistory = await this.prisma.emailHistory.findUnique({
      where: { id: historyId },
      include: { attachments: true, application: { include: { parent: true } } },
    });

    if (!prevHistory) {
      throw new NotFoundException('Previous email history record not found');
    }

    const application = prevHistory.application;
    const parentEmail = application.parent.email;

    if (!parentEmail) {
      throw new BadRequestException('Parent email is missing');
    }

    // Send via notification service
    const notification = await this.notificationService.sendEmail(
      application.parentId,
      parentEmail,
      prevHistory.subject,
      prevHistory.body,
      schoolId,
    );

    // Create a NEW history entry for this resend action
    const newHistory = await this.prisma.emailHistory.create({
      data: {
        applicationId: application.id,
        subject: prevHistory.subject,
        body: prevHistory.body,
        status: 'SENT',
        sentById: adminId,
        messageId: `msg-${Math.random().toString(36).substring(2, 9)}`,
        emailId: notification.id,
      },
    });

    // Copy attachments to new history
    if (prevHistory.attachments && prevHistory.attachments.length > 0) {
      await Promise.all(
        prevHistory.attachments.map((att) =>
          this.prisma.emailAttachment.create({
            data: {
              name: att.name,
              url: att.url,
              type: att.type,
              historyId: newHistory.id,
            },
          }),
        ),
      );
    }

    // Save Log
    await this.prisma.emailLog.create({
      data: {
        historyId: newHistory.id,
        status: 'SENT',
      },
    });

    // Update Application emailStatus
    await this.prisma.application.update({
      where: { id: application.id },
      data: {
        emailStatus: 'SENT',
      },
    });

    // Trigger mock delivery and open simulation
    this.runSimulatedTracking(newHistory.id, parentEmail);

    return {
      success: true,
      historyId: newHistory.id,
      status: 'SENT',
    };
  }

  // Retrieve complete logs and edit/send history for an application
  async getHistory(applicationId: string) {
    return this.prisma.emailHistory.findMany({
      where: { applicationId },
      include: {
        sentBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        attachments: true,
        logs: true,
        tracking: true,
      },
      orderBy: { sentAt: 'desc' },
    });
  }

  // Simulates standard email webhook callbacks for Delivered/Opened tracking
  private runSimulatedTracking(historyId: string, recipient: string) {
    // 1. Simulate "DELIVERED" callback after 4 seconds
    setTimeout(async () => {
      try {
        const history = await this.prisma.emailHistory.findUnique({ where: { id: historyId } });
        if (!history) return;

        // Record tracking event
        await this.prisma.emailTracking.create({
          data: {
            historyId,
            event: 'DELIVERED',
            recipient,
          },
        });

        // Record log
        await this.prisma.emailLog.create({
          data: {
            historyId,
            status: 'DELIVERED',
          },
        });

        // Update history status
        await this.prisma.emailHistory.update({
          where: { id: historyId },
          data: { status: 'DELIVERED' },
        });

        // Update application emailStatus
        await this.prisma.application.update({
          where: { id: history.applicationId },
          data: { emailStatus: 'DELIVERED' },
        });

        // 2. Simulate "OPENED" callback after another 4 seconds
        setTimeout(async () => {
          try {
            await this.prisma.emailTracking.create({
              data: {
                historyId,
                event: 'OPENED',
                recipient,
              },
            });

            await this.prisma.emailLog.create({
              data: {
                historyId,
                status: 'OPENED',
              },
            });

            await this.prisma.emailHistory.update({
              where: { id: historyId },
              data: { status: 'OPENED' },
            });

            await this.prisma.application.update({
              where: { id: history.applicationId },
              data: { emailStatus: 'OPENED' },
            });
          } catch (err) {
            console.error('Simulation open tracking failed:', err);
          }
        }, 4000);

      } catch (err) {
        console.error('Simulation delivery tracking failed:', err);
      }
    }, 4000);
  }
}
