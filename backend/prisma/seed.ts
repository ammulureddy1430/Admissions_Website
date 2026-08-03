import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Clean up existing data (optional, but good for idempotent runs)
  await prisma.assessmentNotification.deleteMany();
  await prisma.assessmentAnswer.deleteMany();
  await prisma.assessmentResult.deleteMany();
  await prisma.assessmentReassignmentAuditLog.deleteMany();
  await prisma.assessmentReassignmentRequest.deleteMany();
  await prisma.assessmentSubmission.deleteMany();
  await prisma.assessmentQuestion.deleteMany();
  await prisma.assessment.deleteMany();

  await prisma.documentAccessLog.deleteMany();
  await prisma.documentDownload.deleteMany();
  await prisma.documentComment.deleteMany();
  await prisma.documentVerificationLog.deleteMany();
  await prisma.documentVersion.deleteMany();
  await prisma.studentDocument.deleteMany();
  await prisma.documentTemplate.deleteMany();
  await prisma.requiredDocument.deleteMany();
  await prisma.documentCategory.deleteMany();
  await prisma.documentNotification.deleteMany();
  await prisma.storageUsage.deleteMany();

  await prisma.subscription.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.cMSPage.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.document.deleteMany();
  await prisma.application.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenantRole.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.schoolClass.deleteMany();
  await prisma.schoolSettings.deleteMany();
  await prisma.school.deleteMany();
  await prisma.savedUniversity.deleteMany();
  await prisma.course.deleteMany();
  await prisma.university.deleteMany();

  const passwordHash = await bcrypt.hash('Password123', 10);

  // 1. Create Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@admissions.com',
      passwordHash,
      role: Role.SUPER_ADMIN,
      firstName: 'Satya',
      lastName: '',
      phone: '+919999999999',
      schoolId: null,
    },
  });

  console.log('Created Super Admin user.');

  // 2. Create Admissions Plans
  const plan = await prisma.plan.create({
    data: {
      name: 'Admissions Pro',
      price: 99.0,
      billingCycle: 'MONTHLY',
      maxApplications: 1000,
      maxLeads: 5000,
    },
  });

  console.log('Seeded subscription plan.');

  // 3. Create Default Demo School
  const school = await prisma.school.create({
    data: {
      name: 'Global Horizons School (Demo)',
      code: 'GHC',
      subdomain: 'demo',
      type: 'School',
      board: 'CBSE',
      address: '100 Overseas Parkway',
      city: 'New Delhi',
      state: 'Delhi',
      country: 'India',
      contactPerson: 'Admissions Desk',
      email: 'admissions@horizons.demo',
      phone: '+919999999900',
      website: 'https://horizons.demo',
      logo: '/global-horizons-school-logo.svg',
      principalName: 'Dr. Sunita Sen',
      themeColor: '#0f172a',
      secondaryColor: '#06b6d4',
    }
  });

  await prisma.subscription.create({
    data: {
      schoolId: school.id,
      planId: plan.id,
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    }
  });

  await prisma.schoolSettings.create({
    data: {
      schoolId: school.id,
      supportEmail: 'support@horizons.demo',
      supportPhone: '+919999999900',
      admissionFee: 1000.0,
      studentAuthType: 'ACCESS_CODE',
    }
  });

  const schoolAdmin = await prisma.user.create({
    data: {
      email: 'admin@horizons.demo',
      passwordHash,
      role: Role.SCHOOL_ADMIN,
      firstName: 'Admissions',
      lastName: 'Manager',
      schoolId: school.id,
    }
  });

  const admissionsStaff = await prisma.user.create({
    data: {
      email: 'staff@horizons.demo',
      passwordHash,
      role: Role.ADMISSIONS_STAFF,
      firstName: 'Neha',
      lastName: 'Gupta',
      schoolId: school.id,
    }
  });

  const parent = await prisma.user.create({
    data: {
      email: 'parent@horizons.demo',
      passwordHash,
      role: Role.PARENT,
      firstName: 'Rahul',
      lastName: 'Sharma',
      phone: '+919999999901',
      schoolId: school.id,
    }
  });

  const parent2 = await prisma.user.create({
    data: {
      email: 'parent2@horizons.demo',
      passwordHash,
      role: Role.PARENT,
      firstName: 'Vikram',
      lastName: 'Malhotra',
      phone: '+919999999902',
      schoolId: school.id,
    }
  });

  const parent3 = await prisma.user.create({
    data: {
      email: 'parent3@horizons.demo',
      passwordHash,
      role: Role.PARENT,
      firstName: 'Amit',
      lastName: 'Verma',
      phone: '+919999999903',
      schoolId: school.id,
    }
  });

  const appAarav = await prisma.application.create({
    data: {
      schoolId: school.id,
      parentId: parent.id,
      studentFirstName: 'Aarav',
      studentLastName: 'Sharma',
      studentDob: new Date('2018-05-15'),
      studentGender: 'MALE',
      grade: 'Grade 1',
      status: 'SUBMITTED',
      paymentStatus: 'PAID',
      fatherName: 'Rahul Sharma',
      fatherOccupation: 'Software Engineer',
      fatherPhone: '+919999999901',
      motherName: 'Priya Sharma',
      motherOccupation: 'Doctor',
      primaryAddress: 'Apt 402, Green Glen Layout',
      city: 'New Delhi',
      state: 'Delhi',
      zipCode: '110075',
      admissionNumber: 'GHC-2026-001',
      section: 'A',
      studentPhoto: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&q=80&w=200',
      studentEmail: 'aarav@school.demo',
      studentPhone: '+919999999951',
      accessCode: 'AARAV123',
    }
  });

  const appDiya = await prisma.application.create({
    data: {
      schoolId: school.id,
      parentId: parent.id,
      studentFirstName: 'Diya',
      studentLastName: 'Sharma',
      studentDob: new Date('2021-09-20'),
      studentGender: 'FEMALE',
      grade: 'Nursery',
      status: 'DRAFT',
      paymentStatus: 'PENDING',
      fatherName: 'Rahul Sharma',
      fatherOccupation: 'Software Engineer',
      fatherPhone: '+919999999901',
      motherName: 'Priya Sharma',
      motherOccupation: 'Doctor',
      primaryAddress: 'Apt 402, Green Glen Layout',
      city: 'New Delhi',
      state: 'Delhi',
      zipCode: '110075',
    }
  });

  const appVihaan = await prisma.application.create({
    data: {
      schoolId: school.id,
      parentId: parent.id,
      studentFirstName: 'Vihaan',
      studentLastName: 'Sharma',
      studentDob: new Date('2016-06-12'),
      studentGender: 'MALE',
      grade: 'Grade 4',
      status: 'SUBMITTED',
      paymentStatus: 'PAID',
      fatherName: 'Rahul Sharma',
      fatherOccupation: 'Software Engineer',
      fatherPhone: '+919999999901',
      motherName: 'Priya Sharma',
      motherOccupation: 'Doctor',
      primaryAddress: 'Apt 402, Green Glen Layout',
      city: 'New Delhi',
      state: 'Delhi',
      zipCode: '110075',
      admissionNumber: 'GHC-2026-002',
      section: 'B',
      studentPhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
      studentEmail: 'vihaan@school.demo',
      studentPhone: '+919999999952',
      accessCode: 'VIHAAN123',
    }
  });

  const appMeera = await prisma.application.create({
    data: {
      schoolId: school.id,
      parentId: parent.id,
      studentFirstName: 'Meera',
      studentLastName: 'Sharma',
      studentDob: new Date('2013-11-05'),
      studentGender: 'FEMALE',
      grade: 'Grade 7',
      status: 'SUBMITTED',
      paymentStatus: 'PAID',
      fatherName: 'Rahul Sharma',
      fatherOccupation: 'Software Engineer',
      fatherPhone: '+919999999901',
      motherName: 'Priya Sharma',
      motherOccupation: 'Doctor',
      primaryAddress: 'Apt 402, Green Glen Layout',
      city: 'New Delhi',
      state: 'Delhi',
      zipCode: '110075',
    }
  });

  const appKabir = await prisma.application.create({
    data: {
      schoolId: school.id,
      parentId: parent2.id,
      studentFirstName: 'Kabir',
      studentLastName: 'Malhotra',
      studentDob: new Date('2015-08-10'),
      studentGender: 'MALE',
      grade: 'Grade 5',
      status: 'APPROVED',
      paymentStatus: 'PAID',
      fatherName: 'Vikram Malhotra',
      fatherOccupation: 'Business Analyst',
      fatherPhone: '+919999999902',
      motherName: 'Meera Malhotra',
      motherOccupation: 'Designer',
      primaryAddress: 'Flat 101, Prestige Apartments',
      city: 'New Delhi',
      state: 'Delhi',
      zipCode: '110001',
      admissionNumber: 'GHC-2026-003',
      section: 'A',
      studentPhoto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200',
      studentEmail: 'kabir@school.demo',
      studentPhone: '+919999999953',
      accessCode: 'KABIR123',
    }
  });

  const appRhea = await prisma.application.create({
    data: {
      schoolId: school.id,
      parentId: parent2.id,
      studentFirstName: 'Rhea',
      studentLastName: 'Malhotra',
      studentDob: new Date('2018-02-14'),
      studentGender: 'FEMALE',
      grade: 'Grade 2',
      status: 'INTERVIEW_SCHEDULED',
      paymentStatus: 'PAID',
      fatherName: 'Vikram Malhotra',
      fatherOccupation: 'Business Analyst',
      fatherPhone: '+919999999902',
      motherName: 'Meera Malhotra',
      motherOccupation: 'Designer',
      primaryAddress: 'Flat 101, Prestige Apartments',
      city: 'New Delhi',
      state: 'Delhi',
      zipCode: '110001',
    }
  });

  const appAditya = await prisma.application.create({
    data: {
      schoolId: school.id,
      parentId: parent3.id,
      studentFirstName: 'Aditya',
      studentLastName: 'Verma',
      studentDob: new Date('2011-11-23'),
      studentGender: 'MALE',
      grade: 'Grade 10',
      status: 'REJECTED',
      paymentStatus: 'PAID',
      fatherName: 'Amit Verma',
      fatherOccupation: 'HR Director',
      fatherPhone: '+919999999903',
      motherName: 'Suman Verma',
      motherOccupation: 'Teacher',
      primaryAddress: 'House 56, Sector 15',
      city: 'New Delhi',
      state: 'Delhi',
      zipCode: '110085',
      admissionNumber: 'GHC-2026-004',
      section: 'C',
      studentPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
      studentEmail: 'aditya@school.demo',
      studentPhone: '+919999999954',
      accessCode: 'ADITYA123',
    }
  });

  // Demo student used by Student Roster Management for an at-school assessment.
  const appAnanya = await prisma.application.create({
    data: {
      schoolId: school.id,
      parentId: parent3.id,
      studentFirstName: 'Ananya',
      studentLastName: 'Sharma',
      studentDob: new Date('2018-03-12'),
      studentGender: 'FEMALE',
      grade: 'Grade 2',
      status: 'ASSESSMENT',
      paymentStatus: 'PAID',
      fatherName: 'Amit Verma',
      fatherOccupation: 'HR Director',
      fatherPhone: '+919999999903',
      motherName: 'Suman Verma',
      motherOccupation: 'Teacher',
      motherPhone: '+919999999904',
      primaryAddress: 'House 56, Sector 15',
      city: 'New Delhi',
      state: 'Delhi',
      zipCode: '110085',
      emergencyContactName: 'Amit Verma',
      emergencyContactPhone: '+919999999903',
      admissionNumber: 'GHC-2026-005',
      section: 'A',
      studentEmail: 'ananya@school.demo',
      studentPhone: '+919999999955',
      assessmentAccessEnabled: true,
      accessCode: 'ANANYA123',
    }
  });

  // Seed payments across different months to populate the revenue timeline chart
  const now = new Date();
  const dateMay = new Date(now.getFullYear(), now.getMonth() - 2, 15);
  const dateJune = new Date(now.getFullYear(), now.getMonth() - 1, 10);
  const dateJuly = new Date(now.getFullYear(), now.getMonth(), 5);

  await prisma.payment.createMany({
    data: [
      {
        schoolId: school.id,
        applicationId: appAarav.id,
        amount: 1000.0,
        currency: 'INR',
        status: 'SUCCESS',
        razorpayOrderId: 'order_aarav_1',
        razorpayPaymentId: 'pay_aarav_1',
        createdAt: dateJuly,
      },
      {
        schoolId: school.id,
        applicationId: appKabir.id,
        amount: 1000.0,
        currency: 'INR',
        status: 'SUCCESS',
        razorpayOrderId: 'order_kabir_1',
        razorpayPaymentId: 'pay_kabir_1',
        createdAt: dateMay,
      },
      {
        schoolId: school.id,
        applicationId: appRhea.id,
        amount: 1000.0,
        currency: 'INR',
        status: 'SUCCESS',
        razorpayOrderId: 'order_rhea_1',
        razorpayPaymentId: 'pay_rhea_1',
        createdAt: dateJune,
      },
      {
        schoolId: school.id,
        applicationId: appAditya.id,
        amount: 1000.0,
        currency: 'INR',
        status: 'SUCCESS',
        razorpayOrderId: 'order_aditya_1',
        razorpayPaymentId: 'pay_aditya_1',
        createdAt: dateMay,
      }
    ]
  });

  // Seed interviews
  await prisma.interview.createMany({
    data: [
      {
        schoolId: school.id,
        applicationId: appKabir.id,
        interviewerId: schoolAdmin.id,
        dateTime: new Date(now.getFullYear(), now.getMonth() - 1, 15, 10, 0),
        status: 'COMPLETED',
        score: 88,
        feedback: 'Kabir performed exceptionally well, expressing clear logical thinking and excellent communication skills.',
        meetingLink: 'https://meet.google.com/kabir-interview',
      },
      {
        schoolId: school.id,
        applicationId: appRhea.id,
        interviewerId: admissionsStaff.id,
        dateTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 11, 30),
        status: 'SCHEDULED',
        meetingLink: 'https://meet.google.com/rhea-interview',
      }
    ]
  });

  const defaultClasses = ['Nursery', 'LKG', 'UKG', ...Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`)];
  await prisma.schoolClass.createMany({
    data: defaultClasses.map((className, index) => ({ schoolId: school.id, name: className, sortOrder: index + 1 })),
  });

  const academicStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const academicYearName = `${academicStartYear}-${academicStartYear + 1}`;
  await prisma.academicYear.create({
    data: {
      schoolId: school.id,
      name: academicYearName,
      startDate: new Date(academicStartYear, 3, 1),
      endDate: new Date(academicStartYear + 1, 2, 31),
    }
  });

  await prisma.tenantRole.createMany({
    data: [
      { schoolId: school.id, name: 'School Admin', permissions: ['*'] },
      { schoolId: school.id, name: 'Admissions Staff', permissions: ['applications.read', 'applications.write', 'interviews.manage', 'documents.review'] },
      { schoolId: school.id, name: 'Parent', permissions: ['applications.own', 'documents.own', 'payments.own'] },
      { schoolId: school.id, name: 'Student', permissions: ['profile.own', 'applications.view'] },
    ],
  });

  await prisma.cMSPage.createMany({
    data: [
      {
        schoolId: school.id,
        title: 'Home',
        slug: 'home',
        content: `# Welcome to Global Horizons School\n\nOur admission portal is now open. Register as a parent, fill out the application details, submit required certificates, and manage interview schedules.`,
        published: true,
      },
      {
        schoolId: school.id,
        title: 'About Us',
        slug: 'about',
        content: `# About Us\n\nWe provide a standard for high-quality education and support development for students.`,
        published: true,
      },
    ],
  });

  console.log('Seeded default Demo School (Global Horizons School).');

  // Clean up mentorship tables
  await prisma.availabilitySlot.deleteMany();
  await prisma.review.deleteMany();
  await prisma.session.deleteMany();
  await prisma.mentor.deleteMany();
  await prisma.webinar.deleteMany();
  await prisma.careerPath.deleteMany();
  await prisma.scholarship.deleteMany();

  // Create Mentor Users & Profiles
  const mentorUser1 = await prisma.user.create({
    data: {
      email: 'anjali.mehta@google.com',
      passwordHash,
      role: Role.MENTOR,
      firstName: 'Dr. Anjali',
      lastName: 'Mehta',
      phone: '+919999999911',
    }
  });

  const mentor1 = await prisma.mentor.create({
    data: {
      userId: mentorUser1.id,
      bio: 'PhD in Computer Science from Stanford University. Former Researcher at Google AI.',
      position: 'Lead AI Scientist',
      company: 'Google',
      university: 'Stanford University',
      country: 'USA',
      yearsExperience: 8,
      languages: ['English', 'Hindi'],
      rating: 4.9,
      skills: ['AI & Data Science', 'Study Abroad', 'Research', 'Coding'],
      sessionPrice: 1500,
      about: 'I specialize in guiding students towards Ivy League admissions, setting up passion research projects, and preparing for research roles in top tier tech organizations.',
      education: [{ degree: 'PhD in Computer Science', institution: 'Stanford', year: '2018' }],
      experience: [{ role: 'Lead AI Scientist', company: 'Google', duration: '2020 - Present' }],
      achievements: ['Stanford Graduate Fellowship', '30+ International Research Publications'],
      research: ['Neuro-symbolic AI models', 'Transformer architectures for genomics'],
      certifications: ['Google Certified Cloud Architect'],
      verified: true,
    }
  });

  const mentorUser2 = await prisma.user.create({
    data: {
      email: 'vikram.sen@rotman.com',
      passwordHash,
      role: Role.MENTOR,
      firstName: 'Vikram',
      lastName: 'Sen',
      phone: '+919999999922',
    }
  });

  const mentor2 = await prisma.mentor.create({
    data: {
      userId: mentorUser2.id,
      bio: 'MBA from University of Toronto. Former Senior Consultant at McKinsey.',
      position: 'Director of Product Management',
      company: 'Amazon',
      university: 'University of Toronto',
      country: 'Canada',
      yearsExperience: 12,
      languages: ['English', 'Bengali'],
      rating: 5.0,
      skills: ['MBA', 'Study Abroad', 'Business', 'Entrepreneurship'],
      sessionPrice: 2000,
      about: 'I help candidates ace MBA applications, crack McKinsey case interviews, and transition smoothly into product management leadership.',
      education: [{ degree: 'MBA', institution: 'Rotman School of Management', year: '2014' }],
      experience: [{ role: 'Director of Product', company: 'Amazon', duration: '2021 - Present' }],
      achievements: ['Rotman Scholar', 'McKinsey Consultant of the Year 2018'],
      research: [],
      certifications: ['Pragmatic Certified Product Leader'],
      verified: true,
    }
  });

  const mentorUser3 = await prisma.user.create({
    data: {
      email: 'rahul.verma@iit.com',
      passwordHash,
      role: Role.MENTOR,
      firstName: 'Rahul',
      lastName: 'Verma',
      phone: '+919999999933',
    }
  });

  const mentor3 = await prisma.mentor.create({
    data: {
      userId: mentorUser3.id,
      bio: 'IIT Madras Alumnus. Mentored over 500+ JEE aspirants to top IITs.',
      position: 'Senior Academic Director',
      company: 'IIT Jee Academy',
      university: 'IIT Madras',
      country: 'India',
      yearsExperience: 6,
      languages: ['English', 'Hindi', 'Tamil'],
      rating: 4.8,
      skills: ['Engineering', 'Civil Services', 'Physics', 'Maths'],
      sessionPrice: 500,
      about: 'Struggling with JEE advanced concepts? I break down tough Physics and Maths topics and provide a bulletproof study plan.',
      education: [{ degree: 'B.Tech in Engineering', institution: 'IIT Madras', year: '2020' }],
      experience: [{ role: 'Academic Director', company: 'IIT Jee Academy', duration: '2020 - Present' }],
      achievements: ['JEE Advanced Rank 84', 'Best Mentor Award 2024'],
      research: [],
      certifications: [],
      verified: true,
    }
  });

  // Seed availability slots for all mentors (10:00 AM, 11:30 AM, 02:00 PM, 04:30 PM, 06:00 PM in 24h format)
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const startTimes = ['10:00', '11:30', '14:00', '16:30', '18:00'];

  for (const mentor of [mentor1, mentor2, mentor3]) {
    for (const day of weekdays) {
      for (const time of startTimes) {
        const [hours, minutes] = time.split(':').map(Number);
        const endHours = hours + 1;
        const endTime = `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        await prisma.availabilitySlot.create({
          data: {
            mentorId: mentor.id,
            dayOfWeek: day,
            startTime: time,
            endTime: endTime,
            timezone: 'UTC',
            recurring: true,
            active: true,
          }
        });
      }
    }
  }

  console.log('Created Mentor users, profiles, and weekly availability slots.');

  // Create Career Paths
  await prisma.careerPath.create({
    data: {
      title: 'Software Engineer',
      salary: '₹8L - ₹45L / year',
      overview: 'Design, build, and maintain software applications and systems.',
      skills: ['JavaScript', 'Python', 'System Design', 'Data Structures'],
      scope: 'Exponential growth with AI developments.',
      roadmap: ['Learn Programming', 'Build Personal Projects', 'Participate in Open Source', 'Crack Interviews'],
      colleges: ['IITs', 'NITs', 'BITS Pilani'],
      exams: ['JEE Mains', 'JEE Advanced', 'BITSAT'],
      scholarships: ['Pehchaan Merit Scholarship'],
      resources: [{ title: 'FreeCodeCamp', link: 'https://freecodecamp.org' }],
      timeline: [{ step: 'Year 1-2', task: 'Acquire core coding skills' }],
    }
  });

  await prisma.careerPath.create({
    data: {
      title: 'Data Scientist',
      salary: '₹10L - ₹50L / year',
      overview: 'Analyze complex data sets to discover actionable patterns and insights.',
      skills: ['Statistics', 'SQL', 'Machine Learning', 'Python/R'],
      scope: 'High demand across finance, tech, and retail.',
      roadmap: ['Learn Math & Stats', 'Master SQL & Python', 'Understand Machine Learning', 'Participate in Kaggle'],
      colleges: ['ISI Kolkata', 'IIT Delhi', 'IISc Bangalore'],
      exams: ['JAM', 'JEE'],
      scholarships: ['CSIR Fellowship'],
      resources: [{ title: 'Kaggle', link: 'https://kaggle.com' }],
      timeline: [{ step: 'Year 1-2', task: 'Master Math & SQL' }],
    }
  });

  console.log('Created Career Paths.');

  // Create Scholarships
  await prisma.scholarship.create({
    data: {
      name: 'Inlaks Shivdasani Foundation Scholarship',
      amount: 100000,
      country: 'UK, USA, Europe',
      eligibility: 'Indian citizens under 30 holding a first-class degree.',
      course: 'Masters/PhD',
      category: 'General',
      deadline: new Date('2026-09-15'),
      checklist: ['Graduation Degree', 'Acceptance Letter', '2 LORs', 'SOP'],
      description: 'Funding for master’s and doctoral degrees abroad.',
    }
  });

  await prisma.scholarship.create({
    data: {
      name: 'Tata Scholarship for Cornell University',
      amount: 50000,
      country: 'USA',
      eligibility: 'Indian citizens admitted to Cornell undergraduate programs.',
      course: 'Undergraduate',
      category: 'Need-based',
      deadline: new Date('2026-11-01'),
      checklist: ['Cornell Admission Letter', 'Family Income Proof', 'Pehchaan Student ID'],
      description: 'Full tuition financial support for Ivy League undergrad applicants.',
    }
  });

  console.log('Created Scholarships.');

  // Create Universities
  const uToronto = await prisma.university.create({
    data: {
      id: 'demo-toronto',
      slug: 'university-of-toronto',
      name: 'University of Toronto',
      shortName: 'UT',
      country: 'Canada',
      city: 'Toronto',
      websiteUrl: 'https://www.utoronto.ca',
      logoUrl: null,
      description: 'A global leader in research and teaching, the University of Toronto has one of the strongest research and teaching faculties in North America.',
      institutionType: 'Public',
      ranking: 25,
      acceptanceRate: 43.0,
      currency: 'INR',
      averageTuition: 3600000,
      livingCost: 1400000,
      applicationFee: 10000,
      verified: true,
      published: true,
      metadata: {
        eligibility: 'Strong academics · English proficiency',
        intake: 'September',
        ielts: 6.5,
        toefl: 100,
        gre: 315,
        gmat: 650,
        pte: 65,
        scholarship: true,
      },
    },
  });

  await prisma.course.createMany({
    data: [
      {
        universityId: uToronto.id,
        slug: 'ut-computer-science-masters',
        name: 'Computer Science',
        degreeLevel: 'Masters',
        fieldOfStudy: 'Computer Science',
        durationMonths: 24,
        tuitionAmount: 3600000,
        currency: 'INR',
        intakes: ['September'],
        deliveryMode: 'Full-Time',
        published: true,
        requirements: { ielts: 6.5, toefl: 100, gre: 315 },
      },
      {
        universityId: uToronto.id,
        slug: 'ut-business-bachelors',
        name: 'Business',
        degreeLevel: 'Bachelors',
        fieldOfStudy: 'Business',
        durationMonths: 48,
        tuitionAmount: 3600000,
        currency: 'INR',
        intakes: ['September'],
        deliveryMode: 'Full-Time',
        published: true,
        requirements: { ielts: 6.5, toefl: 100 },
      },
      {
        universityId: uToronto.id,
        slug: 'ut-engineering-bachelors',
        name: 'Engineering',
        degreeLevel: 'Bachelors',
        fieldOfStudy: 'Engineering',
        durationMonths: 48,
        tuitionAmount: 4000000,
        currency: 'INR',
        intakes: ['September'],
        deliveryMode: 'Full-Time',
        published: true,
        requirements: { ielts: 6.5, toefl: 100 },
      },
    ],
  });

  const uMelbourne = await prisma.university.create({
    data: {
      id: 'demo-melbourne',
      slug: 'university-of-melbourne',
      name: 'University of Melbourne',
      shortName: 'UM',
      country: 'Australia',
      city: 'Melbourne',
      websiteUrl: 'https://www.unimelb.edu.au',
      logoUrl: null,
      description: 'The University of Melbourne is a public research university located in Melbourne, Australia. Founded in 1853, it is Australia\'s second oldest university.',
      institutionType: 'Public',
      ranking: 14,
      acceptanceRate: 70.0,
      currency: 'INR',
      averageTuition: 3100000,
      livingCost: 1500000,
      applicationFee: 8000,
      verified: true,
      published: true,
      metadata: {
        eligibility: 'Relevant academics · English proficiency',
        intake: 'February · July',
        ielts: 6.5,
        toefl: 79,
        gre: 305,
        gmat: 600,
        pte: 58,
        scholarship: true,
      },
    },
  });

  await prisma.course.createMany({
    data: [
      {
        universityId: uMelbourne.id,
        slug: 'um-data-science-masters',
        name: 'Data Science',
        degreeLevel: 'Masters',
        fieldOfStudy: 'Data Science',
        durationMonths: 24,
        tuitionAmount: 3100000,
        currency: 'INR',
        intakes: ['February', 'July'],
        deliveryMode: 'Full-Time',
        published: true,
        requirements: { ielts: 6.5, toefl: 79, gre: 305 },
      },
      {
        universityId: uMelbourne.id,
        slug: 'um-business-bachelors',
        name: 'Business',
        degreeLevel: 'Bachelors',
        fieldOfStudy: 'Business',
        durationMonths: 36,
        tuitionAmount: 3100000,
        currency: 'INR',
        intakes: ['February', 'July'],
        deliveryMode: 'Full-Time',
        published: true,
        requirements: { ielts: 6.5, toefl: 79 },
      },
      {
        universityId: uMelbourne.id,
        slug: 'um-engineering-masters',
        name: 'Engineering',
        degreeLevel: 'Masters',
        fieldOfStudy: 'Engineering',
        durationMonths: 24,
        tuitionAmount: 3500000,
        currency: 'INR',
        intakes: ['February', 'July'],
        deliveryMode: 'Full-Time',
        published: true,
        requirements: { ielts: 6.5, toefl: 79, gre: 305 },
      },
    ],
  });

  const uTum = await prisma.university.create({
    data: {
      id: 'demo-tum',
      slug: 'technical-university-of-munich',
      name: 'Technical University of Munich',
      shortName: 'TUM',
      country: 'Germany',
      city: 'Munich',
      websiteUrl: 'https://www.tum.de',
      logoUrl: null,
      description: 'The Technical University of Munich is a public research university in Munich, Germany. It specializes in engineering, technology, medicine, and applied and natural sciences.',
      institutionType: 'Public',
      ranking: 37,
      acceptanceRate: 8.0,
      currency: 'INR',
      averageTuition: 700000,
      livingCost: 1150000,
      applicationFee: 4000,
      verified: true,
      published: true,
      metadata: {
        eligibility: 'Relevant degree · Language requirements',
        intake: 'Winter · Summer',
        ielts: 6.5,
        toefl: 88,
        gre: 310,
        gmat: 0,
        pte: 65,
        scholarship: false,
      },
    },
  });

  await prisma.course.createMany({
    data: [
      {
        universityId: uTum.id,
        slug: 'tum-computer-science-masters',
        name: 'Computer Science',
        degreeLevel: 'Masters',
        fieldOfStudy: 'Computer Science',
        durationMonths: 24,
        tuitionAmount: 700000,
        currency: 'INR',
        intakes: ['Winter', 'Summer'],
        deliveryMode: 'Full-Time',
        published: true,
        requirements: { ielts: 6.5, toefl: 88, gre: 310 },
      },
      {
        universityId: uTum.id,
        slug: 'tum-engineering-masters',
        name: 'Engineering',
        degreeLevel: 'Masters',
        fieldOfStudy: 'Engineering',
        durationMonths: 24,
        tuitionAmount: 800000,
        currency: 'INR',
        intakes: ['Winter', 'Summer'],
        deliveryMode: 'Full-Time',
        published: true,
        requirements: { ielts: 6.5, toefl: 88 },
      },
      {
        universityId: uTum.id,
        slug: 'tum-data-science-masters',
        name: 'Data Science',
        degreeLevel: 'Masters',
        fieldOfStudy: 'Data Science',
        durationMonths: 24,
        tuitionAmount: 700000,
        currency: 'INR',
        intakes: ['Winter', 'Summer'],
        deliveryMode: 'Full-Time',
        published: true,
        requirements: { ielts: 6.5, toefl: 88, gre: 310 },
      },
    ],
  });

  const uManchester = await prisma.university.create({
    data: {
      id: 'demo-manchester',
      slug: 'university-of-manchester',
      name: 'University of Manchester',
      shortName: 'MU',
      country: 'UK',
      city: 'Manchester',
      websiteUrl: 'https://www.manchester.ac.uk',
      logoUrl: null,
      description: 'The University of Manchester is a public research university in Manchester, England. The main campus is south of Manchester city centre on Oxford Road.',
      institutionType: 'Public',
      ranking: 32,
      acceptanceRate: 56.0,
      currency: 'INR',
      averageTuition: 3050000,
      livingCost: 1300000,
      applicationFee: 6000,
      verified: true,
      published: true,
      metadata: {
        eligibility: 'Strong academics · English proficiency',
        intake: 'September',
        ielts: 6.5,
        toefl: 90,
        gre: 305,
        gmat: 600,
        pte: 59,
        scholarship: true,
      },
    },
  });

  await prisma.course.createMany({
    data: [
      {
        universityId: uManchester.id,
        slug: 'mu-business-masters',
        name: 'Business',
        degreeLevel: 'Masters',
        fieldOfStudy: 'Business',
        durationMonths: 12,
        tuitionAmount: 3050000,
        currency: 'INR',
        intakes: ['September'],
        deliveryMode: 'Full-Time',
        published: true,
        requirements: { ielts: 6.5, toefl: 90, gmat: 600 },
      },
      {
        universityId: uManchester.id,
        slug: 'mu-engineering-bachelors',
        name: 'Engineering',
        degreeLevel: 'Bachelors',
        fieldOfStudy: 'Engineering',
        durationMonths: 36,
        tuitionAmount: 3200000,
        currency: 'INR',
        intakes: ['September'],
        deliveryMode: 'Full-Time',
        published: true,
        requirements: { ielts: 6.5, toefl: 90 },
      },
      {
        universityId: uManchester.id,
        slug: 'mu-medicine-bachelors',
        name: 'Medicine',
        degreeLevel: 'Bachelors',
        fieldOfStudy: 'Medicine',
        durationMonths: 60,
        tuitionAmount: 3600000,
        currency: 'INR',
        intakes: ['September'],
        deliveryMode: 'Full-Time',
        published: true,
        requirements: { ielts: 6.5, toefl: 90 },
      },
    ],
  });

  const uTrinity = await prisma.university.create({
    data: {
      id: 'demo-trinity',
      slug: 'trinity-college-dublin',
      name: 'Trinity College Dublin',
      shortName: 'TC',
      country: 'Ireland',
      city: 'Dublin',
      websiteUrl: 'https://www.tcd.ie',
      logoUrl: null,
      description: 'Trinity College is the sole constituent college of the University of Dublin, a research university in Dublin, Ireland.',
      institutionType: 'Public',
      ranking: 81,
      acceptanceRate: 33.0,
      currency: 'INR',
      averageTuition: 2400000,
      livingCost: 1300000,
      applicationFee: 5000,
      verified: true,
      published: true,
      metadata: {
        eligibility: 'Relevant academics · English proficiency',
        intake: 'September',
        ielts: 6.5,
        toefl: 88,
        gre: 300,
        gmat: 550,
        pte: 63,
        scholarship: true,
      },
    },
  });

  await prisma.course.createMany({
    data: [
      {
        universityId: uTrinity.id,
        slug: 'tc-computer-science-masters',
        name: 'Computer Science',
        degreeLevel: 'Masters',
        fieldOfStudy: 'Computer Science',
        durationMonths: 12,
        tuitionAmount: 2400000,
        currency: 'INR',
        intakes: ['September'],
        deliveryMode: 'Full-Time',
        published: true,
        requirements: { ielts: 6.5, toefl: 88, gre: 300 },
      },
      {
        universityId: uTrinity.id,
        slug: 'tc-business-bachelors',
        name: 'Business',
        degreeLevel: 'Bachelors',
        fieldOfStudy: 'Business',
        durationMonths: 48,
        tuitionAmount: 2200000,
        currency: 'INR',
        intakes: ['September'],
        deliveryMode: 'Full-Time',
        published: true,
        requirements: { ielts: 6.5, toefl: 88 },
      },
      {
        universityId: uTrinity.id,
        slug: 'tc-medicine-bachelors',
        name: 'Medicine',
        degreeLevel: 'Bachelors',
        fieldOfStudy: 'Medicine',
        durationMonths: 60,
        tuitionAmount: 2800000,
        currency: 'INR',
        intakes: ['September'],
        deliveryMode: 'Full-Time',
        published: true,
        requirements: { ielts: 6.5, toefl: 88 },
      },
    ],
  });

  const uNus = await prisma.university.create({
    data: {
      id: 'demo-nus',
      slug: 'national-university-of-singapore',
      name: 'National University of Singapore',
      shortName: 'NUS',
      country: 'Singapore',
      city: 'Singapore',
      websiteUrl: 'https://www.nus.edu.sg',
      logoUrl: null,
      description: 'The National University of Singapore is a public research university in Singapore. Founded in 1905 as the Straits Settlements and Federated Malay States Government Medical School.',
      institutionType: 'Public',
      ranking: 8,
      acceptanceRate: 15.0,
      currency: 'INR',
      averageTuition: 2600000,
      livingCost: 1200000,
      applicationFee: 7000,
      verified: true,
      published: true,
      metadata: {
        eligibility: 'Competitive academics · Programme requirements',
        intake: 'August',
        ielts: 6.5,
        toefl: 92,
        gre: 320,
        gmat: 650,
        pte: 62,
        scholarship: true,
      },
    },
  });

  await prisma.course.createMany({
    data: [
      {
        universityId: uNus.id,
        slug: 'nus-computer-science-masters',
        name: 'Computer Science',
        degreeLevel: 'Masters',
        fieldOfStudy: 'Computer Science',
        durationMonths: 18,
        tuitionAmount: 2600000,
        currency: 'INR',
        intakes: ['August'],
        deliveryMode: 'Full-Time',
        published: true,
        requirements: { ielts: 6.5, toefl: 92, gre: 320 },
      },
      {
        universityId: uNus.id,
        slug: 'nus-business-bachelors',
        name: 'Business',
        degreeLevel: 'Bachelors',
        fieldOfStudy: 'Business',
        durationMonths: 36,
        tuitionAmount: 2400000,
        currency: 'INR',
        intakes: ['August'],
        deliveryMode: 'Full-Time',
        published: true,
        requirements: { ielts: 6.5, toefl: 92 },
      },
      {
        universityId: uNus.id,
        slug: 'nus-engineering-masters',
        name: 'Engineering',
        degreeLevel: 'Masters',
        fieldOfStudy: 'Engineering',
        durationMonths: 18,
        tuitionAmount: 2800000,
        currency: 'INR',
        intakes: ['August'],
        deliveryMode: 'Full-Time',
        published: true,
        requirements: { ielts: 6.5, toefl: 92, gre: 320 },
      },
    ],
  });

  console.log('Created Universities and Courses.');

  // --- SEED DOCUMENT VAULT ---
  console.log('Seeding Document Vault...');

  // 1. Categories
  const catIdentity = await prisma.documentCategory.create({
    data: { name: 'Identity Documents', code: 'IDENTITY', description: 'Aadhaar, passport, birth certificate' }
  });
  const catAcademic = await prisma.documentCategory.create({
    data: { name: 'Academic Documents', code: 'ACADEMIC', description: 'Past report cards, transcripts' }
  });
  const catMedical = await prisma.documentCategory.create({
    data: { name: 'Medical Documents', code: 'MEDICAL', description: 'Vaccination chart, fitness reports' }
  });
  const catFinancial = await prisma.documentCategory.create({
    data: { name: 'Financial Documents', code: 'FINANCIAL', description: 'Income certs, salary slips' }
  });
  const catPersonal = await prisma.documentCategory.create({
    data: { name: 'Personal Documents', code: 'PERSONAL', description: 'Student photos, signatures' }
  });
  const catAdditional = await prisma.documentCategory.create({
    data: { name: 'Additional Documents', code: 'ADDITIONAL', description: 'Other attachments' }
  });

  // 2. Required Documents Config for Default School
  const reqAadhaar = await prisma.requiredDocument.create({
    data: {
      schoolId: school.id,
      categoryId: catIdentity.id,
      name: 'Aadhaar Card',
      isRequired: true,
      grade: 'ALL',
      description: 'Copy of student\'s Aadhaar Card'
    }
  });

  const reqBirthCert = await prisma.requiredDocument.create({
    data: {
      schoolId: school.id,
      categoryId: catIdentity.id,
      name: 'Birth Certificate',
      isRequired: true,
      grade: 'ALL',
      description: 'Official birth certificate'
    }
  });

  const reqReportCard = await prisma.requiredDocument.create({
    data: {
      schoolId: school.id,
      categoryId: catAcademic.id,
      name: 'Previous Year Report Card',
      isRequired: true,
      isConditional: true,
      conditionRule: 'Only required for Grade 1 and above',
      grade: 'ALL',
      description: 'Progress report card of previous class'
    }
  });

  const reqVaccine = await prisma.requiredDocument.create({
    data: {
      schoolId: school.id,
      categoryId: catMedical.id,
      name: 'Vaccination Certificate',
      isRequired: false,
      grade: 'ALL',
      description: 'Immunization details'
    }
  });

  const reqIncome = await prisma.requiredDocument.create({
    data: {
      schoolId: school.id,
      categoryId: catFinancial.id,
      name: 'Income Certificate',
      isRequired: false,
      grade: 'ALL',
      description: 'Parent income certificate'
    }
  });

  // Initialize Storage Usage
  await prisma.storageUsage.create({
    data: {
      schoolId: school.id,
      bytesUsed: 3221225, // ~3 MB
      documentCount: 4
    }
  });

  // 3. Uploaded Documents for Aarav Sharma
  const docAadhaar = await prisma.studentDocument.create({
    data: {
      schoolId: school.id,
      applicationId: appAarav.id,
      requiredDocumentId: reqAadhaar.id,
      categoryId: catIdentity.id,
      name: 'Aadhaar Card',
      fileName: 'aarav_aadhaar.pdf',
      fileType: 'application/pdf',
      fileSize: 1024 * 512, // 512 KB
      url: `https://admissionsos-storage.s3.amazonaws.com/tenants/${school.id}/applications/${appAarav.id}/aarav_aadhaar.pdf`,
      currentVersion: 1,
      status: 'VERIFIED',
      uploadedById: parent.id,
      verifiedById: schoolAdmin.id,
      verifiedAt: new Date(),
      checksum: 'e10adc3949ba59abbe56e057f20f883e'
    }
  });

  await prisma.documentVersion.create({
    data: {
      studentDocumentId: docAadhaar.id,
      versionNumber: 1,
      fileName: 'aarav_aadhaar.pdf',
      fileType: 'application/pdf',
      fileSize: 1024 * 512,
      url: docAadhaar.url,
      uploadedById: parent.id
    }
  });

  const docBirthCert = await prisma.studentDocument.create({
    data: {
      schoolId: school.id,
      applicationId: appAarav.id,
      requiredDocumentId: reqBirthCert.id,
      categoryId: catIdentity.id,
      name: 'Birth Certificate',
      fileName: 'aarav_birthcert.pdf',
      fileType: 'application/pdf',
      fileSize: 1024 * 800, // 800 KB
      url: `https://admissionsos-storage.s3.amazonaws.com/tenants/${school.id}/applications/${appAarav.id}/aarav_birthcert.pdf`,
      currentVersion: 1,
      status: 'VERIFIED',
      uploadedById: parent.id,
      verifiedById: schoolAdmin.id,
      verifiedAt: new Date(),
      checksum: 'e10adc3949ba59abbe56e057f20f883f'
    }
  });

  await prisma.documentVersion.create({
    data: {
      studentDocumentId: docBirthCert.id,
      versionNumber: 1,
      fileName: 'aarav_birthcert.pdf',
      fileType: 'application/pdf',
      fileSize: 1024 * 800,
      url: docBirthCert.url,
      uploadedById: parent.id
    }
  });

  const docReportCard = await prisma.studentDocument.create({
    data: {
      schoolId: school.id,
      applicationId: appAarav.id,
      requiredDocumentId: reqReportCard.id,
      categoryId: catAcademic.id,
      name: 'Previous Year Report Card',
      fileName: 'aarav_reportcard_v2.pdf',
      fileType: 'application/pdf',
      fileSize: 1024 * 1500, // 1.5 MB
      url: `https://admissionsos-storage.s3.amazonaws.com/tenants/${school.id}/applications/${appAarav.id}/aarav_reportcard_v2.pdf`,
      currentVersion: 2,
      status: 'UNDER_REVIEW',
      uploadedById: parent.id,
      checksum: 'e10adc3949ba59abbe56e057f20f8840'
    }
  });

  // Version 1 of report card (replaced)
  await prisma.documentVersion.create({
    data: {
      studentDocumentId: docReportCard.id,
      versionNumber: 1,
      fileName: 'aarav_reportcard_v1.pdf',
      fileType: 'application/pdf',
      fileSize: 1024 * 1200,
      url: `https://admissionsos-storage.s3.amazonaws.com/tenants/${school.id}/applications/${appAarav.id}/aarav_reportcard_v1.pdf`,
      uploadedById: parent.id,
      createdAt: new Date(Date.now() - 24 * 3600 * 1000) // 1 day ago
    }
  });

  // Version 2 of report card (current)
  await prisma.documentVersion.create({
    data: {
      studentDocumentId: docReportCard.id,
      versionNumber: 2,
      fileName: 'aarav_reportcard_v2.pdf',
      fileType: 'application/pdf',
      fileSize: 1024 * 1500,
      url: docReportCard.url,
      uploadedById: parent.id
    }
  });

  const docVaccine = await prisma.studentDocument.create({
    data: {
      schoolId: school.id,
      applicationId: appAarav.id,
      requiredDocumentId: reqVaccine.id,
      categoryId: catMedical.id,
      name: 'Vaccination Certificate',
      fileName: 'aarav_vaccine.jpg',
      fileType: 'image/jpeg',
      fileSize: 1024 * 300, // 300 KB
      url: `https://admissionsos-storage.s3.amazonaws.com/tenants/${school.id}/applications/${appAarav.id}/aarav_vaccine.jpg`,
      currentVersion: 1,
      status: 'REJECTED',
      rejectionReason: 'Blurred copy',
      remarks: 'Please upload a high resolution scan of the certificate where details are readable.',
      uploadedById: parent.id,
      rejectedById: schoolAdmin.id,
      rejectedAt: new Date(),
      checksum: 'e10adc3949ba59abbe56e057f20f8841'
    }
  });

  await prisma.documentVersion.create({
    data: {
      studentDocumentId: docVaccine.id,
      versionNumber: 1,
      fileName: 'aarav_vaccine.jpg',
      fileType: 'image/jpeg',
      fileSize: 1024 * 300,
      url: docVaccine.url,
      uploadedById: parent.id
    }
  });

  // Comments for vaccination doc
  await prisma.documentComment.create({
    data: {
      studentDocumentId: docVaccine.id,
      userId: schoolAdmin.id,
      text: 'The text is blurry on the right side. Please scan again.'
    }
  });

  // Audit Logs
  await prisma.documentAuditLog.createMany({
    data: [
      { schoolId: school.id, userId: parent.id, action: 'UPLOAD', documentName: 'Aadhaar Card', details: 'Uploaded version 1 of Aadhaar Card' },
      { schoolId: school.id, userId: parent.id, action: 'UPLOAD', documentName: 'Birth Certificate', details: 'Uploaded version 1 of Birth Certificate' },
      { schoolId: school.id, userId: parent.id, action: 'UPLOAD', documentName: 'Previous Year Report Card', details: 'Uploaded version 1 of Report Card' },
      { schoolId: school.id, userId: parent.id, action: 'UPLOAD', documentName: 'Vaccination Certificate', details: 'Uploaded version 1 of Vaccination Certificate' },
      { schoolId: school.id, userId: schoolAdmin.id, action: 'VERIFY', documentName: 'Aadhaar Card', details: 'Verified Aadhaar Card' },
      { schoolId: school.id, userId: schoolAdmin.id, action: 'VERIFY', documentName: 'Birth Certificate', details: 'Verified Birth Certificate' },
      { schoolId: school.id, userId: schoolAdmin.id, action: 'REJECT', documentName: 'Vaccination Certificate', details: 'Rejected Vaccination Certificate: Blurred copy' },
      { schoolId: school.id, userId: parent.id, action: 'UPLOAD', documentName: 'Previous Year Report Card', details: 'Replaced Report Card, uploaded version 2' },
    ]
  });

  console.log('Seeded Document Vault.');

  // --- Seed Assessments ---
  console.log('Seeding Assessments...');

  // 1. Reusable Math Assessment Template for Grade 1
  const mathTemplate = await prisma.assessment.create({
    data: {
      schoolId: school.id,
      title: 'Grade 1 Math Entrance Assessment',
      description: 'Standard entrance assessment evaluating basic math skills for Grade 1 candidates.',
      instructions: 'Please read all questions carefully. Answer the questions to the best of your ability. A calculator is not allowed.',
      grade: 'Grade 1',
      subject: 'Mathematics',
      difficulty: 'MEDIUM',
      questionCount: 3,
      timeLimit: 30,
      totalMarks: 30.0,
      passingMarks: 15.0,
      allowCalculator: false,
      shuffleQuestions: false,
      shuffleOptions: false,
      showResultImmediately: true,
      allowRetake: false,
      status: 'PUBLISHED',
    }
  });

  await prisma.assessmentQuestion.createMany({
    data: [
      {
        assessmentId: mathTemplate.id,
        type: 'MCQ',
        questionText: 'What is 5 + 7?',
        options: ['10', '11', '12', '13'] as any,
        correctAnswer: '12',
        explanation: '5 + 7 equals 12.',
        marks: 10.0,
        order: 0,
      },
      {
        assessmentId: mathTemplate.id,
        type: 'MCQ',
        questionText: 'Which number comes next: 2, 4, 6, 8, __?',
        options: ['9', '10', '11', '12'] as any,
        correctAnswer: '10',
        explanation: 'The sequence increases by 2 each step.',
        marks: 10.0,
        order: 1,
      },
      {
        assessmentId: mathTemplate.id,
        type: 'WRITTEN',
        questionText: 'Write the number name for 15.',
        correctAnswer: 'Fifteen',
        explanation: 'The word form of 15 is fifteen.',
        marks: 10.0,
        order: 2,
      }
    ]
  });

  // 2. Reusable English Assessment Template for Nursery
  const englishTemplate = await prisma.assessment.create({
    data: {
      schoolId: school.id,
      title: 'Nursery English Placement Test',
      description: 'Basic alphabet recognition and phonics check.',
      instructions: 'To be completed with the help of a parent/guardian. Identify the correct letter.',
      grade: 'Nursery',
      subject: 'English Literature',
      difficulty: 'EASY',
      questionCount: 2,
      timeLimit: 20,
      totalMarks: 20.0,
      passingMarks: 10.0,
      allowCalculator: false,
      shuffleQuestions: false,
      shuffleOptions: false,
      showResultImmediately: true,
      allowRetake: true,
      retakeCount: 2,
      status: 'PUBLISHED',
    }
  });

  await prisma.assessmentQuestion.createMany({
    data: [
      {
        assessmentId: englishTemplate.id,
        type: 'MCQ',
        questionText: 'Which letter comes after A?',
        options: ['B', 'C', 'D', 'E'] as any,
        correctAnswer: 'B',
        explanation: 'Alphabet order: A, B, C...',
        marks: 10.0,
        order: 0,
      },
      {
        assessmentId: englishTemplate.id,
        type: 'MCQ',
        questionText: 'Identify the letter that makes the "ah" sound like Apple.',
        options: ['A', 'B', 'M', 'S'] as any,
        correctAnswer: 'A',
        explanation: 'Letter A makes the short "ah" sound.',
        marks: 10.0,
        order: 1,
      }
    ]
  });

  // 3. At-school assessment assignment shown in Student Roster Management.
  const atSchoolTemplate = await prisma.assessment.create({
    data: {
      schoolId: school.id,
      title: 'AT-School Entrance Assessment',
      description: 'On-campus entrance assessment for Grade 2 applicants.',
      instructions: 'Report to the assigned room 15 minutes before the booked slot.',
      grade: 'Grade 2',
      subject: 'General Aptitude',
      difficulty: 'MEDIUM',
      questionCount: 2,
      timeLimit: 45,
      totalMarks: 20.0,
      passingMarks: 10.0,
      allowCalculator: false,
      shuffleQuestions: false,
      shuffleOptions: false,
      showResultImmediately: false,
      allowRetake: false,
      status: 'PUBLISHED',
      assessmentMode: 'SCHOOL',
      proctoringEnabled: true,
    }
  });

  const ananyaSchoolAssessment = await prisma.assessment.create({
    data: {
      schoolId: school.id,
      applicationId: appAnanya.id,
      title: 'AT-School Entrance Assessment',
      description: 'On-campus entrance assessment for the Grade 2 demo student.',
      instructions: 'Report to the assigned room 15 minutes before the booked slot.',
      grade: 'Grade 2',
      subject: 'General Aptitude',
      difficulty: 'MEDIUM',
      questionCount: 2,
      timeLimit: 45,
      totalMarks: 20.0,
      passingMarks: 10.0,
      allowCalculator: false,
      shuffleQuestions: false,
      shuffleOptions: false,
      showResultImmediately: false,
      allowRetake: false,
      status: 'PUBLISHED',
      assessmentMode: 'SCHOOL',
      proctoringEnabled: true,
      dueDate: new Date('2026-08-09T11:00:00.000Z'),
    }
  });

  await prisma.assessmentQuestion.createMany({
    data: [atSchoolTemplate.id, ananyaSchoolAssessment.id].flatMap((assessmentId) => [
      {
        assessmentId,
        type: 'MCQ',
        questionText: 'Which number completes the pattern: 2, 4, 6, __?',
        options: ['7', '8', '9', '10'] as any,
        correctAnswer: '8',
        explanation: 'The pattern increases by two.',
        marks: 10.0,
        order: 0,
      },
      {
        assessmentId,
        type: 'MCQ',
        questionText: 'Which word is the opposite of hot?',
        options: ['Warm', 'Cold', 'Bright', 'Fast'] as any,
        correctAnswer: 'Cold',
        explanation: 'Cold is the opposite of hot.',
        marks: 10.0,
        order: 1,
      },
    ])
  });

  const ananyaSchedule = await prisma.assessmentSchedule.create({
    data: {
      assessmentId: atSchoolTemplate.id,
      assessmentDate: new Date('2026-08-09T00:00:00.000Z'),
      campus: 'Main Campus',
      building: 'Academic Block',
      floor: 'Ground Floor',
      roomNumber: 'G-12',
      venue: 'Global Horizons School, Main Campus',
      instructions: 'Bring the admission acknowledgement and arrive 15 minutes early.',
      contactPerson: 'Admissions Desk',
      contactPhone: '+919999999900',
      contactEmail: 'admissions@horizons.demo',
      documentsRequired: ['Admission acknowledgement'],
      createdBy: schoolAdmin.id,
    }
  });

  const ananyaSlot = await prisma.assessmentSlot.create({
    data: {
      assessmentScheduleId: ananyaSchedule.id,
      slotName: 'Morning Slot',
      startTime: '10:00 AM',
      endTime: '10:45 AM',
      capacity: 20,
      bookedCount: 1,
    }
  });

  await prisma.studentSlotBooking.create({
    data: {
      assessmentId: ananyaSchoolAssessment.id,
      studentId: appAnanya.id,
      parentId: parent3.id,
      slotId: ananyaSlot.id,
      bookingStatus: 'BOOKED',
      attendanceStatus: 'PENDING',
    }
  });

  // 4. Assigned Assessment & Submission for Aarav Sharma
  const assignedMath = await prisma.assessment.create({
    data: {
      schoolId: school.id,
      applicationId: appAarav.id,
      title: 'Math Entrance Assessment - Aarav Sharma',
      description: 'Entrance assessment evaluating basic math skills for Grade 1 candidates.',
      instructions: 'Please read all questions carefully.',
      grade: 'Grade 1',
      subject: 'Mathematics',
      difficulty: 'MEDIUM',
      questionCount: 3,
      timeLimit: 30,
      totalMarks: 30.0,
      passingMarks: 15.0,
      allowCalculator: false,
      shuffleQuestions: false,
      shuffleOptions: false,
      showResultImmediately: true,
      allowRetake: false,
      status: 'PUBLISHED',
    }
  });

  // Since we want to link answers to these questions via foreign key, let's create them individually to get IDs
  const q1 = await prisma.assessmentQuestion.create({
    data: {
      assessmentId: assignedMath.id,
      type: 'MCQ',
      questionText: 'What is 5 + 7?',
      options: ['10', '11', '12', '13'] as any,
      correctAnswer: '12',
      explanation: '5 + 7 equals 12.',
      marks: 10.0,
      order: 0,
    }
  });

  const q2 = await prisma.assessmentQuestion.create({
    data: {
      assessmentId: assignedMath.id,
      type: 'MCQ',
      questionText: 'Which number comes next: 2, 4, 6, 8, __?',
      options: ['9', '10', '11', '12'] as any,
      correctAnswer: '10',
      explanation: 'The sequence increases by 2 each step.',
      marks: 10.0,
      order: 1,
    }
  });

  const q3 = await prisma.assessmentQuestion.create({
    data: {
      assessmentId: assignedMath.id,
      type: 'WRITTEN',
      questionText: 'Write the number name for 15.',
      correctAnswer: 'Fifteen',
      explanation: 'The word form of 15 is fifteen.',
      marks: 10.0,
      order: 2,
    }
  });

  // Submission for Aarav (Evaluated)
  const submission = await prisma.assessmentSubmission.create({
    data: {
      assessmentId: assignedMath.id,
      applicationId: appAarav.id,
      status: 'EVALUATED',
      attemptNumber: 1,
      startedAt: new Date(Date.now() - 2 * 3600 * 1000),
      submittedAt: new Date(Date.now() - 1.8 * 3600 * 1000),
      timeTaken: 720,
    }
  });

  await prisma.assessmentAnswer.createMany({
    data: [
      {
        submissionId: submission.id,
        questionId: q1.id,
        selectedOption: '12',
        marksObtained: 10.0,
        teacherRemarks: 'Correct answer.',
      },
      {
        submissionId: submission.id,
        questionId: q2.id,
        selectedOption: '10',
        marksObtained: 10.0,
        teacherRemarks: 'Correct answer.',
      },
      {
        submissionId: submission.id,
        questionId: q3.id,
        writtenAnswer: 'Fivteen', // slightly misspelled
        marksObtained: 8.0,
        teacherRemarks: 'Almost correct spelling.',
      }
    ]
  });

  await prisma.assessmentResult.create({
    data: {
      assessmentId: assignedMath.id,
      applicationId: appAarav.id,
      score: 28.0,
      percentage: (28.0 / 30.0) * 100,
      correctCount: 2,
      wrongCount: 1,
      status: 'PASS',
      remarks: 'Excellent work Aarav!',
      publishedAt: new Date(),
    }
  });

  console.log('Seeded Assessments.');

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
