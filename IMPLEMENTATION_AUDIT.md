# Higher Education & Mentorship Platform — Repository Audit

## Baseline

- Frontend: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, and a small local component library.
- Backend: NestJS REST API with Prisma and PostgreSQL.
- Infrastructure: Docker Compose for PostgreSQL, Redis, and MinIO.
- Authentication: JWT access and refresh tokens, cookie or bearer-token extraction, and an existing role guard.
- Existing domains: school admissions, higher-education applications, mentorship, sessions, messages, reviews, projects, resume reviews, portfolios, careers, scholarships, notifications, payments, and CMS.
- Baseline production builds: frontend and backend both compile successfully.

## Material Gaps

### Architecture

- The main higher-education feature route is a single client component exceeding 3,800 lines.
- API base URLs are duplicated and hard-coded throughout the frontend.
- Higher-education and mentorship concerns are mixed into one dynamic route instead of independently testable modules.
- There is no shared typed API client, normalized client-side error model, or consistent pagination contract.

### Persistence

- University search, saved universities, comparison, webinars, and parts of the dashboard still depend on local or demo data.
- Universities and courses are not represented in the database.
- Session dates and webinar times are stored as strings rather than timestamps.
- Webinar registration does not persist.
- Mentor follows and saves do not persist.
- Projects have no mentor assignment, team membership, deliverables, resources, or normalized milestones.
- Resume reviews have no document type or version history.
- Messages have no conversations, attachments, read state, edit state, or search index.
- Sessions have no type, price snapshot, timezone, cancellation reason, attendance, notes, resources, or follow-up tasks.
- Notifications lack read state, action links, delivery attempts, and user channel preferences.

### Security and Authorization

- Several mentorship mutations are authenticated but not role-protected.
- Mentor verification is available to any authenticated user.
- Project and resume mutations do not consistently verify ownership.
- Review creation is not tied to a completed session.
- CORS currently accepts every origin.
- JWT strategies include insecure source-code fallback secrets.
- Payment and file-upload services include mock fallbacks that can appear successful.

### Product Workflows

- Mentor discovery lacks pagination, categories, featured ordering, following, saved mentors, and recommendations.
- Availability is not connected transactionally to booking.
- Rescheduling, cancellation policy, reminders, attendance, notes, resources, and follow-up tasks are incomplete.
- Messaging is polling-style one-to-one text only.
- Career assessments, skill-gap analysis, recommendations, and roadmaps are not persisted.
- Scholarship matching and deadline tracking are not personalized.
- Passion projects and entrepreneurship workflows are not modeled end-to-end.
- Alumni relationships and networking events are not modeled.
- Admin tooling does not cover the requested higher-education content and moderation domains.
- Global search does not exist across the requested entities.

### Quality and Operations

- Existing tests cover only the default Nest starter endpoint.
- The frontend lint baseline has hundreds of pre-existing violations.
- No end-to-end tests cover authentication, booking, messaging, application tracking, or authorization.
- No structured request logging, health/readiness checks, rate limiting, background jobs, or delivery retry records exist.

## Implementation Direction

1. Establish typed enums and normalized relational models for institutions, programs, mentorship, sessions, conversations, projects, reviews, assessments, notifications, and saved entities.
2. Enforce role and ownership checks in services and controllers.
3. Introduce consistent cursor/page pagination, query validation, API error responses, and a shared frontend API client.
4. Break the higher-education UI into domain routes and reusable feature components.
5. Replace local/demo workflows with persisted REST APIs.
6. Add integration and end-to-end coverage for the critical workflows.
7. Remove production-success mock fallbacks and require explicit development-only adapters.

This audit is the implementation baseline; existing user changes are preserved and evolved in place.
