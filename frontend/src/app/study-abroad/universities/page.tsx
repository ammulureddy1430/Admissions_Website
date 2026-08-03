"use client";

import {
  ArrowRight,
  Bookmark,
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  Search,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type CourseSummary = {
  id: string;
  name: string;
  degreeLevel: string;
  fieldOfStudy: string;
};

type University = {
  id: string;
  slug: string;
  name: string;
  shortName?: string | null;
  country: string;
  city: string;
  logoUrl?: string | null;
  description: string;
  ranking?: number | null;
  verified: boolean;
  averageTuition?: string | null;
  currency: string;
  courses: CourseSummary[];
};

type CatalogResponse = {
  items: University[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type SavedRecord = { universityId: string };

export default function UniversitiesPage() {
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCatalog = useCallback(
    async (page = 1, nextSearch = search, nextCountry = country) => {
      setLoading(true);
      setError("");
      try {
        const query = new URLSearchParams({
          page: String(page),
          pageSize: "18",
        });
        if (nextSearch.trim()) query.set("search", nextSearch.trim());
        if (nextCountry) query.set("country", nextCountry);
        const data = await apiFetch<CatalogResponse>(
          `/education/universities?${query}`,
        );
        setCatalog(data);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load universities.",
        );
      } finally {
        setLoading(false);
      }
    },
    [country, search],
  );

  useEffect(() => {
    void loadCatalog();
    apiFetch<string[]>("/education/countries")
      .then(setCountries)
      .catch(() => setCountries([]));
    if (localStorage.getItem("token")) {
      apiFetch<SavedRecord[]>("/education/saved-universities")
        .then((records) =>
          setSavedIds(new Set(records.map((record) => record.universityId))),
        )
        .catch(() => setSavedIds(new Set()));
    }
  }, [loadCatalog]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void loadCatalog(1);
  };

  const toggleSaved = async (universityId: string) => {
    const wasSaved = savedIds.has(universityId);
    setSavedIds((current) => {
      const next = new Set(current);
      if (wasSaved) next.delete(universityId);
      else next.add(universityId);
      return next;
    });
    try {
      await apiFetch(`/education/saved-universities/${universityId}`, {
        method: wasSaved ? "DELETE" : "POST",
      });
    } catch (requestError) {
      setSavedIds((current) => {
        const next = new Set(current);
        if (wasSaved) next.add(universityId);
        else next.delete(universityId);
        return next;
      });
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update your shortlist.",
      );
    }
  };

  return (
    <div className="study-page">
      <header className="study-page-header">
        <div className="study-feature-icon">
          <Building2 />
        </div>
        <div>
          <span>University discovery</span>
          <h1>Find the right university</h1>
          <p>
            Search the reviewed Pehchaan catalog and explore published
            programmes before starting an application.
          </p>
        </div>
      </header>

      <form className="study-panel study-search-panel" onSubmit={submit}>
        <div className="study-search-title">
          <div>
            <span className="study-search-kicker">
              <Search /> Institution catalog
            </span>
            <h2>Search universities</h2>
            <p>Filter by institution, location, subject, or destination.</p>
          </div>
          <Link href="/study-abroad/saved" className="study-reset">
            <Bookmark /> View shortlist
          </Link>
        </div>
        <label className="study-keyword">
          <span>University, city, or subject</span>
          <div>
            <Search />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="For example, computer science in Toronto"
            />
          </div>
        </label>
        <div className="study-filters">
          <label>
            <span>Destination</span>
            <select
              value={country}
              onChange={(event) => {
                const value = event.target.value;
                setCountry(value);
                void loadCatalog(1, search, value);
              }}
            >
              <option value="">All destinations</option>
              {countries.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="study-search-actions">
          <button className="study-primary" type="submit">
            <Search /> Search
          </button>
        </div>
      </form>

      {error && (
        <div className="study-application-notice" role="alert">
          {error}
        </div>
      )}

      <section className="study-demo-results">
        <div className="study-demo-heading">
          <div>
            <span>Published institutions</span>
            <h2>University results</h2>
            <p>
              Catalog entries are managed by authorized administrators and
              link to each institution&apos;s published programmes.
            </p>
          </div>
          <div className="study-results-tools">
            <strong>
              {loading
                ? "Loading…"
                : `${catalog?.pagination.total ?? 0} universities`}
            </strong>
          </div>
        </div>

        {loading ? (
          <div className="study-auth-loading">
            <Loader2 className="animate-spin" />
            <p>Loading the university catalog…</p>
          </div>
        ) : catalog?.items.length ? (
          <>
            <div className="study-university-grid">
              {catalog.items.map((university) => {
                const saved = savedIds.has(university.id);
                return (
                  <article key={university.id}>
                    <div className="study-university-top">
                      <span className="study-university-logo">
                        <Building2 />
                      </span>
                      {university.verified && (
                        <span className="study-live-badge">
                          <CheckCircle2 /> Verified
                        </span>
                      )}
                    </div>
                    <h3>{university.name}</h3>
                    <p>
                      <MapPin className="inline h-3 w-3" /> {university.city},{" "}
                      {university.country}
                    </p>
                    <dl>
                      <div>
                        <dt>Ranking</dt>
                        <dd>
                          {university.ranking
                            ? `#${university.ranking}`
                            : "Not published"}
                        </dd>
                      </div>
                      <div>
                        <dt>Published programmes</dt>
                        <dd>{university.courses.length || "None yet"}</dd>
                      </div>
                    </dl>
                    <div className="study-university-actions">
                      <Link href={`/study-abroad/universities/${university.slug}`}>
                        View details <ArrowRight />
                      </Link>
                      <button
                        type="button"
                        className={saved ? "selected" : ""}
                        onClick={() => void toggleSaved(university.id)}
                      >
                        <Bookmark /> {saved ? "Saved" : "Save"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            {catalog.pagination.totalPages > 1 && (
              <div className="study-search-actions">
                <button
                  type="button"
                  className="study-reset"
                  disabled={catalog.pagination.page <= 1}
                  onClick={() => void loadCatalog(catalog.pagination.page - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {catalog.pagination.page} of{" "}
                  {catalog.pagination.totalPages}
                </span>
                <button
                  type="button"
                  className="study-reset"
                  disabled={
                    catalog.pagination.page >= catalog.pagination.totalPages
                  }
                  onClick={() => void loadCatalog(catalog.pagination.page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="study-no-results">
            <Search />
            <h3>No published universities match these filters</h3>
            <p>Try a broader term or remove the destination filter.</p>
          </div>
        )}
      </section>
    </div>
  );
}
