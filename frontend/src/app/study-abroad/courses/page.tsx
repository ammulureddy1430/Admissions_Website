"use client";

import { ArrowRight, BookOpenText, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Course = {
  id: string;
  name: string;
  degreeLevel: string;
  fieldOfStudy: string;
  durationMonths?: number | null;
  tuitionAmount?: string | null;
  currency: string;
  intakes: string[];
  university: { slug: string; name: string; country: string };
};

type CourseResponse = {
  items: Course[];
  pagination: { page: number; total: number; totalPages: number };
};

export default function CoursesPage() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [degreeLevel, setDegreeLevel] = useState("");
  const [data, setData] = useState<CourseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (page = 1) => {
    setLoading(true);
    setError("");
    const query = new URLSearchParams({ page: String(page), pageSize: "24" });
    if (search.trim()) query.set("search", search.trim());
    if (degreeLevel) query.set("degreeLevel", degreeLevel);
    try {
      setData(await apiFetch<CourseResponse>(`/education/courses?${query}`));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load programmes.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // Initial URL state is intentionally loaded once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void load();
  };

  return (
    <div className="study-page">
      <header className="study-page-header">
        <div className="study-feature-icon"><BookOpenText /></div>
        <div><span>Course explorer</span><h1>Discover programmes</h1><p>Compare published programmes across universities, study levels, fields, intakes, duration, and tuition.</p></div>
      </header>
      <form className="study-panel study-search-panel" onSubmit={submit}>
        <label className="study-keyword"><span>Programme or field</span><div><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="For example, data science or MBA" /></div></label>
        <div className="study-filters">
          <label><span>Study level</span><select value={degreeLevel} onChange={(event) => setDegreeLevel(event.target.value)}><option value="">All levels</option><option>Bachelors</option><option>Masters</option><option>PhD</option><option>Certificate</option></select></label>
        </div>
        <div className="study-search-actions"><button className="study-primary" type="submit"><Search /> Search programmes</button></div>
      </form>
      {error && <div className="study-application-notice" role="alert">{error}</div>}
      <section className="study-panel">
        <div className="study-panel-heading"><div><h2>Published programmes</h2><p>{data?.pagination.total ?? 0} results in the reviewed catalog.</p></div></div>
        {loading ? <div className="study-auth-loading"><Loader2 className="animate-spin" /><p>Loading programmes…</p></div> : data?.items.length ? <div className="study-saved-list">{data.items.map((course) => <article key={course.id}><span className="study-university-logo"><BookOpenText /></span><div><strong>{course.name}</strong><small>{course.degreeLevel} · {course.fieldOfStudy}</small><small>{course.university.name} · {course.university.country}{course.durationMonths ? ` · ${course.durationMonths} months` : ""}</small></div><Link href={`/study-abroad/universities/${course.university.slug}`}>University details <ArrowRight /></Link><Link href={`/study-abroad/applications?university=${encodeURIComponent(course.university.name)}&programme=${encodeURIComponent(course.name)}`}>Apply <ArrowRight /></Link></article>)}</div> : <div className="study-no-results"><Search /><h3>No programmes match these filters</h3><p>Try a broader course name or another study level.</p></div>}
        {data && data.pagination.totalPages > 1 && <div className="study-search-actions"><button className="study-reset" disabled={data.pagination.page <= 1} onClick={() => void load(data.pagination.page - 1)}>Previous</button><span>Page {data.pagination.page} of {data.pagination.totalPages}</span><button className="study-reset" disabled={data.pagination.page >= data.pagination.totalPages} onClick={() => void load(data.pagination.page + 1)}>Next</button></div>}
      </section>
    </div>
  );
}
