import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { API_URL } from "@/lib/api";

type Course = {
  id: string;
  name: string;
  degreeLevel: string;
  fieldOfStudy: string;
  durationMonths?: number | null;
  tuitionAmount?: string | null;
  currency: string;
  intakes: string[];
  deliveryMode?: string | null;
};

type University = {
  id: string;
  name: string;
  country: string;
  city: string;
  websiteUrl?: string | null;
  description: string;
  institutionType?: string | null;
  ranking?: number | null;
  verified: boolean;
  averageTuition?: string | null;
  livingCost?: string | null;
  currency: string;
  courses: Course[];
};

async function getUniversity(slug: string) {
  const response = await fetch(
    `${API_URL}/education/universities/${encodeURIComponent(slug)}`,
    { cache: "no-store" },
  );
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error("Unable to load this university.");
  return response.json() as Promise<University>;
}

export default async function UniversityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const university = await getUniversity(slug);

  return (
    <div className="study-page">
      <Link href="/study-abroad/universities" className="study-reset">
        <ArrowLeft /> Back to universities
      </Link>
      <header className="study-page-header">
        <div className="study-feature-icon">
          <Building2 />
        </div>
        <div>
          <span>
            {university.institutionType || "Higher education institution"}
          </span>
          <h1>{university.name}</h1>
          <p>
            <MapPin className="inline h-4 w-4" /> {university.city},{" "}
            {university.country}
          </p>
        </div>
      </header>

      <section className="study-panel">
        <div className="study-panel-heading">
          <div>
            <h2>Institution overview</h2>
            <p>{university.description}</p>
          </div>
          {university.verified && (
            <span className="study-official-count">
              <CheckCircle2 /> Verified catalog entry
            </span>
          )}
        </div>
        <div className="study-stats">
          <article>
            <span>Ranking</span>
            <strong>
              {university.ranking ? `#${university.ranking}` : "Not published"}
            </strong>
          </article>
          <article>
            <span>Average tuition</span>
            <strong>
              {university.averageTuition
                ? `${university.currency} ${university.averageTuition}`
                : "Contact institution"}
            </strong>
          </article>
          <article>
            <span>Published programmes</span>
            <strong>{university.courses.length}</strong>
          </article>
        </div>
        {university.websiteUrl && (
          <a
            className="study-primary"
            href={university.websiteUrl}
            target="_blank"
            rel="noreferrer"
          >
            Official website <ExternalLink />
          </a>
        )}
      </section>

      <section className="study-panel">
        <div className="study-panel-heading">
          <div>
            <h2>Available programmes</h2>
            <p>
              Review published programme information and confirm final
              requirements with the institution.
            </p>
          </div>
        </div>
        {university.courses.length ? (
          <div className="study-saved-list">
            {university.courses.map((course) => (
              <article key={course.id}>
                <span className="study-university-logo">
                  <Building2 />
                </span>
                <div>
                  <strong>{course.name}</strong>
                  <small>
                    {course.degreeLevel} · {course.fieldOfStudy}
                    {course.durationMonths
                      ? ` · ${course.durationMonths} months`
                      : ""}
                  </small>
                  {course.intakes.length > 0 && (
                    <small>
                      <Clock className="inline h-3 w-3" /> Intakes:{" "}
                      {course.intakes.join(", ")}
                    </small>
                  )}
                </div>
                <Link
                  href={`/study-abroad/applications?university=${encodeURIComponent(university.name)}&programme=${encodeURIComponent(course.name)}`}
                >
                  Start application <ArrowRight />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="study-no-results">
            <Building2 />
            <h3>No programmes are published yet</h3>
            <p>Use the official website to review the latest course catalog.</p>
          </div>
        )}
      </section>
    </div>
  );
}
