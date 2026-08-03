"use client";

import { FileText, GraduationCap, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api";

type SearchResults = {
  universities: { id: string; slug: string; name: string; city: string; country: string }[];
  courses: { id: string; slug: string; name: string; degreeLevel: string; university: { name: string } }[];
  scholarships: { id: string; name: string; country: string; provider?: string | null }[];
  mentors: { id: string; position: string; company: string; user: { firstName: string; lastName: string } }[];
  applications: { id: string; institutionName: string; programme: string; status: string }[];
  documents: { id: string; originalName?: string | null; reviewType: string; status: string }[];
};

export function StudyGlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (query.trim().length < 2) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<SearchResults>(
        `/education/search?search=${encodeURIComponent(query.trim())}&limit=5`,
      );
      setResults(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Search is temporarily unavailable.",
      );
    } finally {
      setLoading(false);
    }
  };

  const total = results
    ? Object.values(results).reduce((count, items) => count + items.length, 0)
    : 0;

  return (
    <div className="study-global-search">
      <form onSubmit={submit}>
        <Search />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!event.target.value) setResults(null);
          }}
          placeholder="Search universities, courses, mentors, scholarships, applications, and documents"
          aria-label="Search your higher education workspace"
        />
        <button type="submit" disabled={loading || query.trim().length < 2}>
          {loading ? "Searching…" : "Search"}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {results && (
        <div className="study-global-results">
          <div>
            <strong>{total} results</strong>
            <button type="button" onClick={() => setResults(null)}>
              Close
            </button>
          </div>
          {results.universities.map((item) => (
            <Link key={`u-${item.id}`} href={`/study-abroad/universities/${item.slug}`}>
              <GraduationCap />
              <span><strong>{item.name}</strong><small>{item.city}, {item.country}</small></span>
            </Link>
          ))}
          {results.courses.map((item) => (
            <Link key={`c-${item.id}`} href={`/study-abroad/courses?search=${encodeURIComponent(item.name)}`}>
              <GraduationCap />
              <span><strong>{item.name}</strong><small>{item.degreeLevel} · {item.university.name}</small></span>
            </Link>
          ))}
          {results.mentors.map((item) => (
            <Link key={`m-${item.id}`} href={`/study-abroad/mentorship?mentor=${item.id}`}>
              <UserRound />
              <span><strong>{item.user.firstName} {item.user.lastName}</strong><small>{item.position} · {item.company}</small></span>
            </Link>
          ))}
          {results.scholarships.map((item) => (
            <Link key={`s-${item.id}`} href={`/study-abroad/scholarships?search=${encodeURIComponent(item.name)}`}>
              <GraduationCap />
              <span><strong>{item.name}</strong><small>{item.provider || item.country}</small></span>
            </Link>
          ))}
          {results.applications.map((item) => (
            <Link key={`a-${item.id}`} href="/study-abroad/applications">
              <FileText />
              <span><strong>{item.institutionName}</strong><small>{item.programme} · {item.status}</small></span>
            </Link>
          ))}
          {results.documents.map((item) => (
            <Link key={`d-${item.id}`} href="/study-abroad/documents">
              <FileText />
              <span><strong>{item.originalName || item.reviewType}</strong><small>{item.status}</small></span>
            </Link>
          ))}
          {total === 0 && <p>No results match “{query}”.</p>}
        </div>
      )}
    </div>
  );
}
