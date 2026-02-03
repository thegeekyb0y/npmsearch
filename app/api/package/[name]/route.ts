import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

const redis = Redis.fromEnv();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const name = (await params).name;

  if (!name) {
    return NextResponse.json(
      { error: "Package name is required" },
      { status: 400 },
    );
  }

  const cacheKey = `package:${name}`;

  try {
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      return NextResponse.json(
        typeof cachedData === "string" ? JSON.parse(cachedData) : cachedData,
      );
    }

    const response = await fetch(`https://registry.npmjs.org/${name}`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const data = await response.json();

    await redis.set(cacheKey, JSON.stringify(data), { ex: 3600 });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Package API Error: ", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
