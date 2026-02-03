import React from "react";

interface NpmPackage {
  name: string;
  description: string;
  "dist-tags": {
    latest: string;
  };
  homepage: string;
}

async function getNpmData(packageName: string): Promise<NpmPackage> {
  const res = await fetch(`https://registry.npmjs.org/${packageName}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch NPM data");
  }

  return res.json();
}

export default async function Home() {
  const data = await getNpmData("ws");

  return (
    <main className="p-8 min-h-screen bg-background">
      <div className="max-w-md mx-auto border border-muted/20 p-6 shadow-sm bg-foreground2">
        <h1 className="text-2xl font-bold mb-2 text-foreground">{data.name}</h1>

        <p className="text-bwhite mb-4">{data.description}</p>

        <div className="flex items-center justify-between text-sm">
          <span className="bg-brand/10 text-brand px-2 py-1 rounded font-mono">
            v{data["dist-tags"].latest}
          </span>

          <a
            href={data.homepage}
            className="text-brand hover:brightness-125 transition-all"
            target="_blank"
          >
            Visit Homepage
          </a>
        </div>
      </div>
    </main>
  );
}
