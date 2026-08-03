"use client";

import {
  ArrowRight,
  BadgeDollarSign,
  Bookmark,
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  Loader2,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Star,
  Users,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Session = {
  id: string;
  topic: string;
  status: string;
  startsAt?: string | null;
  date: string;
  time: string;
  duration: number;
  meetingLink?: string | null;
  mentor: { user: { firstName: string; lastName: string } };
};

type Application = {
  id: string;
  institutionName: string;
  programme: string;
  intake: string;
  status: string;
  updatedAt: string;
};

type Mentor = {
  id: string;
  position: string;
  company: string;
  university: string;
  rating: number;
  verified: boolean;
  user: { firstName: string; lastName: string };
};

type Scholarship = {
  id: string;
  name: string;
  country: string;
  deadline: string;
  provider?: string | null;
};

type Webinar = {
  id: string;
  title: string;
  host: string;
  time: string;
  startsAt?: string | null;
  meetingLink: string;
};

type DashboardResponse = {
  upcomingSessions: Session[];
  projects: { id: string; status: string }[];
  resumes: { id: string; status: string }[];
};

type DashboardData = {
  sessions: Session[];
  applications: Application[];
  savedCount: number;
  projectsCount: number;
  reviewsCount: number;
  mentors: Mentor[];
  scholarships: Scholarship[];
  webinars: Webinar[];
  countries: string[];
};

const emptyDashboard: DashboardData = {
  sessions: [],
  applications: [],
  savedCount: 0,
  projectsCount: 0,
  reviewsCount: 0,
  mentors: [],
  scholarships: [],
  webinars: [],
  countries: [],
};

function formatDate(value?: string | null, fallback?: string) {
  if (!value) return fallback || "Date pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback || value;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function StudyAbroadDashboard() {
  const [firstName, setFirstName] = useState("Student");
  const [data, setData] = useState<DashboardData>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [registeredWebinars, setRegisteredWebinars] = useState<Set<string>>(
    new Set(),
  );

  const loadDashboard = useCallback(async (background = false) => {
    background ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const [
        dashboard,
        saved,
        applications,
        mentors,
        scholarships,
        webinars,
        countries,
      ] = await Promise.all([
        apiFetch<DashboardResponse>("/mentorship/dashboards/student"),
        apiFetch<{ universityId: string }[]>(
          "/education/saved-universities",
        ),
        apiFetch<Application[]>("/higher-education-applications/mine"),
        apiFetch<Mentor[]>("/mentorship/mentors?verified=true"),
        apiFetch<Scholarship[]>("/mentorship/scholarships"),
        apiFetch<Webinar[]>("/mentorship/webinars"),
        apiFetch<string[]>("/education/countries"),
      ]);
      setData({
        sessions: dashboard.upcomingSessions || [],
        applications,
        savedCount: saved.length,
        projectsCount: dashboard.projects?.length || 0,
        reviewsCount:
          dashboard.resumes?.filter((item) => item.status === "REVIEWED")
            .length || 0,
        mentors: mentors.slice(0, 3),
        scholarships: scholarships
          .filter((item) => new Date(item.deadline) >= new Date())
          .slice(0, 3),
        webinars: webinars.slice(0, 3),
        countries,
      });
      setLastUpdated(new Date());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Your dashboard could not be refreshed.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setFirstName(user.firstName || "Student");
    } catch {
      setFirstName("Student");
    }
    void loadDashboard();
    const interval = window.setInterval(() => void loadDashboard(true), 30_000);
    return () => window.clearInterval(interval);
  }, [loadDashboard]);

  const registerWebinar = async (id: string) => {
    try {
      await apiFetch(`/mentorship/webinars/${id}/register`, { method: "POST" });
      setRegisteredWebinars((current) => new Set(current).add(id));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Webinar registration failed.",
      );
    }
  };

  const activeApplications = data.applications.filter(
    (application) =>
      !["ACCEPTED", "DECLINED", "WITHDRAWN"].includes(application.status),
  );

  return (
    <div className="study-page study-dashboard">
      <header className="study-dashboard-welcome">
        <div>
          <span>
            <Sparkles /> Live higher education workspace
          </span>
          <h1>Welcome back, {firstName}.</h1>
          <p>
            Your next sessions, applications, deadlines, and mentor actions are
            synchronized from your account.
          </p>
        </div>
        <div className="study-dashboard-sync">
          <small>
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "Waiting for first sync"}
          </small>
          <button
            type="button"
            onClick={() => void loadDashboard(true)}
            disabled={refreshing}
          >
            <RefreshCw className={refreshing ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="study-dashboard-alert" role="alert">
          {error}
          <button type="button" onClick={() => void loadDashboard()}>
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="study-dashboard-loading">
          <Loader2 className="animate-spin" />
          <p>Synchronizing your workspace…</p>
        </div>
      ) : (
        <>
          <section className="study-dashboard-metrics">
            {[
              {
                label: "Saved universities",
                value: data.savedCount,
                icon: Bookmark,
                href: "/study-abroad/saved",
              },
              {
                label: "Active applications",
                value: activeApplications.length,
                icon: FileText,
                href: "/study-abroad/applications",
              },
              {
                label: "Upcoming sessions",
                value: data.sessions.length,
                icon: Calendar,
                href: "/study-abroad/bookings",
              },
              {
                label: "Active projects",
                value: data.projectsCount,
                icon: BriefcaseBusiness,
                href: "/study-abroad/projects",
              },
            ].map(({ label, value, icon: Icon, href }) => (
              <Link key={label} href={href}>
                <span>
                  <Icon />
                </span>
                <div>
                  <small>{label}</small>
                  <strong>{value}</strong>
                </div>
                <ArrowRight />
              </Link>
            ))}
          </section>

          <div className="study-dashboard-grid">
            <section className="study-dashboard-card study-dashboard-sessions">
              <div className="study-dashboard-card__heading">
                <div>
                  <span>Mentorship</span>
                  <h2>Upcoming sessions</h2>
                </div>
                <Link href="/study-abroad/bookings">
                  View history <ArrowRight />
                </Link>
              </div>
              {data.sessions.length ? (
                <div className="study-dashboard-list">
                  {data.sessions.slice(0, 4).map((session) => (
                    <article key={session.id}>
                      <div className="study-dashboard-date">
                        <Calendar />
                      </div>
                      <div>
                        <span>{session.status}</span>
                        <h3>{session.topic}</h3>
                        <p>
                          {session.mentor.user.firstName}{" "}
                          {session.mentor.user.lastName} · {session.duration} min
                        </p>
                        <small>
                          <Clock />{" "}
                          {formatDate(
                            session.startsAt,
                            `${session.date} at ${session.time}`,
                          )}
                        </small>
                      </div>
                      {session.meetingLink && (
                        <a
                          href={session.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Video /> Join
                        </a>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="study-dashboard-empty">
                  <Calendar />
                  <h3>No upcoming sessions</h3>
                  <p>Find a verified mentor and choose an available time.</p>
                  <Link href="/study-abroad/mentorship">Find a mentor</Link>
                </div>
              )}
            </section>

            <section className="study-dashboard-card">
              <div className="study-dashboard-card__heading">
                <div>
                  <span>Admissions</span>
                  <h2>Application progress</h2>
                </div>
                <Link href="/study-abroad/applications">
                  Manage <ArrowRight />
                </Link>
              </div>
              {activeApplications.length ? (
                <div className="study-dashboard-list compact">
                  {activeApplications.slice(0, 4).map((application) => (
                    <article key={application.id}>
                      <div className="study-dashboard-date">
                        <GraduationCap />
                      </div>
                      <div>
                        <span>{application.status.replaceAll("_", " ")}</span>
                        <h3>{application.institutionName}</h3>
                        <p>
                          {application.programme} · {application.intake}
                        </p>
                      </div>
                      <Link
                        href={`/study-abroad/applications?application=${application.id}`}
                      >
                        Open
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="study-dashboard-empty">
                  <FileText />
                  <h3>No active applications</h3>
                  <p>Start with a programme from the university catalog.</p>
                  <Link href="/study-abroad/universities">
                    Explore universities
                  </Link>
                </div>
              )}
            </section>
          </div>

          <section className="study-dashboard-card">
            <div className="study-dashboard-card__heading">
              <div>
                <span>Recommended for you</span>
                <h2>Verified mentors</h2>
              </div>
              <Link href="/study-abroad/mentorship">
                Browse all <ArrowRight />
              </Link>
            </div>
            {data.mentors.length ? (
              <div className="study-dashboard-mentors">
                {data.mentors.map((mentor) => (
                  <article key={mentor.id}>
                    <div className="study-mentor-avatar">
                      {mentor.user.firstName[0]}
                      {mentor.user.lastName[0]}
                    </div>
                    <div>
                      <span>
                        <CheckCircle2 /> Verified mentor
                      </span>
                      <h3>
                        {mentor.user.firstName} {mentor.user.lastName}
                      </h3>
                      <p>
                        {mentor.position} at {mentor.company}
                      </p>
                      <small>
                        <Star /> {mentor.rating.toFixed(1)} ·{" "}
                        {mentor.university}
                      </small>
                    </div>
                    <Link
                      href={`/study-abroad/mentorship?mentor=${mentor.id}`}
                    >
                      View profile
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="study-dashboard-empty">
                <Users />
                <h3>No verified mentors are available yet</h3>
                <p>Approved mentor profiles will appear here automatically.</p>
              </div>
            )}
          </section>

          <div className="study-dashboard-grid secondary">
            <section className="study-dashboard-card">
              <div className="study-dashboard-card__heading">
                <div>
                  <span>Funding</span>
                  <h2>Upcoming scholarship deadlines</h2>
                </div>
                <Link href="/study-abroad/scholarships">
                  Explore <ArrowRight />
                </Link>
              </div>
              {data.scholarships.length ? (
                <div className="study-dashboard-list compact">
                  {data.scholarships.map((scholarship) => (
                    <article key={scholarship.id}>
                      <div className="study-dashboard-date">
                        <BadgeDollarSign />
                      </div>
                      <div>
                        <span>{scholarship.country}</span>
                        <h3>{scholarship.name}</h3>
                        <p>{scholarship.provider || "Funding opportunity"}</p>
                        <small>
                          Deadline {formatDate(scholarship.deadline)}
                        </small>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="study-dashboard-empty">
                  <BadgeDollarSign />
                  <h3>No upcoming deadlines</h3>
                  <p>New active scholarships will appear after publication.</p>
                </div>
              )}
            </section>

            <section className="study-dashboard-card">
              <div className="study-dashboard-card__heading">
                <div>
                  <span>Live learning</span>
                  <h2>Mentor webinars</h2>
                </div>
              </div>
              {data.webinars.length ? (
                <div className="study-dashboard-list compact">
                  {data.webinars.map((webinar) => {
                    const registered = registeredWebinars.has(webinar.id);
                    return (
                      <article key={webinar.id}>
                        <div className="study-dashboard-date">
                          <Video />
                        </div>
                        <div>
                          <span>Hosted by {webinar.host}</span>
                          <h3>{webinar.title}</h3>
                          <small>
                            <Clock />{" "}
                            {formatDate(webinar.startsAt, webinar.time)}
                          </small>
                        </div>
                        <button
                          type="button"
                          disabled={registered}
                          onClick={() => void registerWebinar(webinar.id)}
                        >
                          {registered ? "Registered" : "Register"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="study-dashboard-empty">
                  <Video />
                  <h3>No scheduled webinars</h3>
                  <p>Verified mentor events will appear here when published.</p>
                </div>
              )}
            </section>
          </div>

          {/* Today's Tasks & Deadlines Widget */}
          <div className="study-dashboard-grid secondary">
            <section className="study-dashboard-card">
              <div className="study-dashboard-card__heading">
                <div>
                  <span>Action Items</span>
                  <h2>Today's Tasks & Deadlines</h2>
                </div>
                <Link href="/study-abroad/timeline">
                  View Timeline <ArrowRight />
                </Link>
              </div>
              <div className="study-dashboard-list compact">
                <article>
                  <div className="study-dashboard-date"><CheckCircle2 className="text-[#009b87]" /></div>
                  <div>
                    <span>High Priority · Document Vault</span>
                    <h3>Upload Official Financial Proof / Bank Statement</h3>
                    <small>Deadline Today, 5:00 PM</small>
                  </div>
                </article>
                <article>
                  <div className="study-dashboard-date"><Clock className="text-amber-500" /></div>
                  <div>
                    <span>Application Action · Stanford University</span>
                    <h3>Finalize & Review Statement of Purpose (SOP)</h3>
                    <small>Deadline Jul 25, 2026</small>
                  </div>
                </article>
                <article>
                  <div className="study-dashboard-date"><BadgeDollarSign className="text-indigo-500" /></div>
                  <div>
                    <span>Scholarship · Chevening Scholarship</span>
                    <h3>Submit Recommendation Reference Contact</h3>
                    <small>Deadline Aug 01, 2026</small>
                  </div>
                </article>
              </div>
            </section>

            <section className="study-dashboard-card">
              <div className="study-dashboard-card__heading">
                <div>
                  <span>Status Overview</span>
                  <h2>Offers & Pending Documents</h2>
                </div>
                <Link href="/study-abroad/documents">
                  Vault <ArrowRight />
                </Link>
              </div>
              <div className="study-dashboard-list compact">
                <article>
                  <div className="study-dashboard-date"><Sparkles className="text-emerald-500" /></div>
                  <div>
                    <span className="text-emerald-500 font-bold">Offer Letter Received</span>
                    <h3>University of Toronto (MS Data Science)</h3>
                    <small>Conditional Offer · Deposit Due Aug 15</small>
                  </div>
                </article>
                <article>
                  <div className="study-dashboard-date"><FileText className="text-rose-500" /></div>
                  <div>
                    <span className="text-rose-500 font-bold">Pending Document</span>
                    <h3>Passport Renewal Copy & LOR 2</h3>
                    <small>Pending Verification Review</small>
                  </div>
                </article>
              </div>
            </section>
          </div>

          {/* Recent Messages & Activity Log Widget */}
          <div className="study-dashboard-grid secondary">
            <section className="study-dashboard-card">
              <div className="study-dashboard-card__heading">
                <div>
                  <span>Communications</span>
                  <h2>Recent Messages</h2>
                </div>
                <Link href="/study-abroad/inbox">
                  Open Inbox <ArrowRight />
                </Link>
              </div>
              <div className="study-dashboard-list compact">
                <article>
                  <div className="study-dashboard-date"><MessageSquare className="text-indigo-400" /></div>
                  <div>
                    <span>Dr. Sarah Jenkins (Stanford Mentor)</span>
                    <h3>"SOP draft review is complete with comments..."</h3>
                    <small>2 hours ago</small>
                  </div>
                </article>
                <article>
                  <div className="study-dashboard-date"><MessageSquare className="text-emerald-400" /></div>
                  <div>
                    <span>University Admissions Office</span>
                    <h3>"Your application status has been updated to Under Review."</h3>
                    <small>Yesterday</small>
                  </div>
                </article>
              </div>
            </section>

            <section className="study-dashboard-card">
              <div className="study-dashboard-card__heading">
                <div>
                  <span>Audit Stream</span>
                  <h2>Recent Activities</h2>
                </div>
              </div>
              <div className="study-dashboard-list compact">
                <article>
                  <div className="study-dashboard-date"><CheckCircle2 className="text-emerald-400" /></div>
                  <div>
                    <span>Application Submitted</span>
                    <h3>Submitted Application to Imperial College London</h3>
                    <small>Jul 19, 2026</small>
                  </div>
                </article>
                <article>
                  <div className="study-dashboard-date"><Users className="text-indigo-400" /></div>
                  <div>
                    <span>Mentorship Session</span>
                    <h3>Completed 1-on-1 Strategy Call with Prof. Marcus</h3>
                    <small>Jul 18, 2026</small>
                  </div>
                </article>
              </div>
            </section>
          </div>

          <section className="study-dashboard-actions">
            <div>
              <span>Continue your journey</span>
              <h2>What would you like to work on next?</h2>
            </div>
            <div>
              <Link href="/study-abroad/universities">
                <GraduationCap /> Search universities
              </Link>
              <Link href="/study-abroad/mentorship">
                <Users /> Find a mentor
              </Link>
              <Link href="/study-abroad/inbox">
                <MessageSquare /> Open messages
              </Link>
              <Link href="/study-abroad/careers">
                <BriefcaseBusiness /> Explore careers
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
