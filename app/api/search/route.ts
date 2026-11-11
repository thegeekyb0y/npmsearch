import { NextRequest, NextResponse } from "next/server";
import { CACHE_TTL, cacheGet, cacheSet, searchCacheKey } from "@/app/lib/cache";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const cacheKey = searchCacheKey(query);
  const cached = await cacheGet<unknown>(cacheKey);

  if (cached !== null) {
    return NextResponse.json(cached);
  }

  try {
    const newData = await fetch(`https://api.npms.io/v2/search?q=${query}`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!newData.ok) throw new Error("NPMS API error");

    const data: unknown = await newData.json();

    await cacheSet(cacheKey, data, CACHE_TTL.search);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Search API Error: ", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
