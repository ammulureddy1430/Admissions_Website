import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

type CatalogUniversity = {
  id: string;
  slug: string;
  name: string;
  country: string;
  city: string;
  websiteUrl?: string | null;
  ranking?: number | null;
};

type CatalogResponse = {
  items: CatalogUniversity[];
  pagination: { total: number };
};

export async function GET(request: NextRequest) {
  try {
    if (request.nextUrl.searchParams.get("mode") === "countries") {
      const response = await fetch(`${API_URL}/education/countries`, {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error("Country catalog request failed");
      const countries = (await response.json()) as string[];
      return NextResponse.json({ countries, total: countries.length });
    }

    const query = new URLSearchParams();
    const name = request.nextUrl.searchParams.get("name")?.trim();
    const country = request.nextUrl.searchParams.get("country")?.trim();
    if (name) query.set("search", name);
    if (country) query.set("country", country);
    query.set("pageSize", "60");

    const response = await fetch(`${API_URL}/education/universities?${query}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error("University catalog request failed");
    const payload = (await response.json()) as CatalogResponse;
    return NextResponse.json({
      universities: payload.items.map((record) => ({
        id: record.id,
        slug: record.slug,
        name: record.name,
        country: record.country,
        region: record.city,
        countryCode: "",
        domain: record.websiteUrl ? new URL(record.websiteUrl).hostname : "",
        website: record.websiteUrl || "",
        ranking: record.ranking,
      })),
      total: payload.pagination.total,
    });
  } catch {
    return NextResponse.json(
      { message: "The university catalog is temporarily unavailable." },
      { status: 502 },
    );
  }
}
