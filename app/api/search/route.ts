import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

const redis = Redis.fromEnv();

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const cacheKey = `search:${query}`;
  try {
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      return NextResponse.json(
        typeof cachedData === "string" ? JSON.parse(cachedData) : cachedData,
      );
    }

    const newData = await fetch(`https://api.npms.io/v2/search?q=${query}`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!newData.ok) throw new Error("NPMS API error");

    const data = await newData.json();

    await redis.set(cacheKey, JSON.stringify(data), { ex: 300 });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Search API Error: ", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
