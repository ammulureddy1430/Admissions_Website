"use client";

import {
  ArrowRight,
  Bookmark,
  Building2,
  Loader2,
  MapPin,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type SavedUniversity = {
  universityId: string;
  university: {
    id: string;
    slug: string;
    name: string;
    city: string;
    country: string;
    ranking?: number | null;
    courses: { id: string; name: string; degreeLevel: string }[];
  };
};

export default function SavedUniversitiesPage() {
  const [records, setRecords] = useState<SavedUniversity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<SavedUniversity[]>("/education/saved-universities")
      .then(setRecords)
      .catch((requestError) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load your shortlist.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const remove = async (universityId: string) => {
    const previous = records;
    setRecords((current) =>
      current.filter((record) => record.universityId !== universityId),
    );
    try {
      await apiFetch(`/education/saved-universities/${universityId}`, {
        method: "DELETE",
      });
    } catch (requestError) {
      setRecords(previous);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to remove this university.",
      );
    }
  };

  return (
    <div className="study-page">
      <header className="study-page-header">
        <div className="study-feature-icon">
          <Bookmark />
        </div>
        <div>
          <span>Your shortlist</span>
          <h1>Saved universities</h1>
          <p>
            Revisit institutions you are considering and move directly into
            programme review or application planning.
          </p>
        </div>
      </header>
      <section className="study-panel">
        <div className="study-panel-heading">
          <div>
            <h2>Shortlisted institutions</h2>
            <p>Your shortlist is securely saved to your account.</p>
          </div>
          <Link className="study-primary" href="/study-abroad/universities">
            <Search /> Find universities
          </Link>
        </div>
        {error && (
          <div className="study-application-notice" role="alert">
            {error}
          </div>
        )}
        {loading ? (
          <div className="study-auth-loading">
            <Loader2 className="animate-spin" />
            <p>Loading your shortlist…</p>
          </div>
        ) : records.length ? (
          <div className="study-saved-list">
            {records.map(({ university }) => (
              <article key={university.id}>
                <span className="study-university-logo">
                  <Building2 />
                </span>
                <div>
                  <strong>{university.name}</strong>
                  <small>
                    <MapPin className="inline h-3 w-3" /> {university.city},{" "}
                    {university.country}
                  </small>
                  <small>
                    {university.courses.length} published programme
                    {university.courses.length === 1 ? "" : "s"}
                  </small>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(university.id)}
                >
                  <Trash2 /> Remove
                </button>
                <Link href={`/study-abroad/universities/${university.slug}`}>
                  View details <ArrowRight />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="study-no-results">
            <Bookmark />
            <h3>Your shortlist is empty</h3>
            <p>Save universities from the discovery catalog to see them here.</p>
          </div>
        )}
      </section>
    </div>
  );
}
