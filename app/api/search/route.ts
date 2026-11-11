import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/app/lib/redis";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const cacheKey = `search:${query}`;
  const redis = getRedis();

  if (redis) {
    try {
      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        return NextResponse.json(
          typeof cachedData === "string" ? JSON.parse(cachedData) : cachedData,
        );
      }
    } catch (error) {
      console.error("Search cache read error:", error);
    }
  }

  try {
    const newData = await fetch(`https://api.npms.io/v2/search?q=${query}`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!newData.ok) throw new Error("NPMS API error");

    const data = await newData.json();

    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(data), { ex: 300 });
      } catch (error) {
        console.error("Search cache write error:", error);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Search API Error: ", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
