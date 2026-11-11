import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/app/lib/rate-limit";
import { searchPackages } from "@/app/lib/registry";
import { parseSearchParams } from "@/app/lib/search-params";

const SEARCH_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

function getClientIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anonymous"
  );
}

export async function GET(req: NextRequest) {
  const parsed = parseSearchParams(req.nextUrl.searchParams);

  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.message },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const rateLimit = await checkRateLimit(getClientIdentifier(req));

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          ...NO_STORE_HEADERS,
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  try {
    const data = await searchPackages(parsed.value.q, {
      from: parsed.value.from,
      size: parsed.value.size,
    });

    return NextResponse.json(data, { headers: SEARCH_CACHE_HEADERS });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Registry unavailable" },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }
}
