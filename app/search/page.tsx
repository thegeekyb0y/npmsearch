import React from "react";

interface Package {
  name: string;
  version: string;
  description: string;
  links: {
    npm: string;
    homepage?: string;
    repository?: string;
  };
}

interface SearchResult {
  package: Package;
  score: {
    final: number;
  };
  weeklyDownloads?: number;
}

interface SearchResponse {
  total: number;
  results: SearchResult[];
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  if (!q) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono">
        <p className="text-gray-500 text-xl">/ waiting for query...</p>
      </div>
    );
  }

  let data: SearchResponse = { total: 0, results: [] };

  try {
    const res = await fetch(`http://localhost:3000/api/search?q=${q}`, {
      cache: "no-store",
    });

    if (!res.ok) throw new Error("Failed");
    data = await res.json();

    // 2. PRO TRICK: Downloads Fetch karna (Parallel API Calls)
    if (data.results && data.results.length > 0) {
      // Promise.all ek saath saari API calls karta hai (Super Fast)

      const downloadPromises = data.results.map((item) =>
        fetch(
          `https://api.npmjs.org/downloads/point/last-week/${item.package.name}`,
        )
          .then((res) => (res.ok ? res.json() : { downloads: 0 }))
          .catch(() => ({ downloads: 0 })),
      );

      const downloadStats = await Promise.all(downloadPromises);

      // 3. Downloads ko original data ke sath merge kar do
      data.results = data.results.map((item, index) => ({
        ...item,
        weeklyDownloads: downloadStats[index]?.downloads || 0,
      }));
    }
  } catch (e) {
    return (
      <div className="text-red-500 p-10 font-mono">
        Error: API Failed (Check Redis/Server)
      </div>
    );
  }

  const results = data.results || [];

  // Helper function numbers ko sundar dikhane ke liye (e.g., 1200000 -> 1.2M)
  const formatDownloads = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  return (
    <div className="min-h-screen font-mono bg-black text-white">
      {/* Header Same Rahega */}
      <header className="border-b border-gray-800 p-4 sticky top-0 bg-black/95 backdrop-blur z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <a href="/" className="font-bold text-brand hover:text-gray-200">
            ~/npmsearch
          </a>

          <form className="flex-1 flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="search packages..."
              className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-4 py-2 rounded focus:outline-none focus:border-white transition-colors placeholder:text-gray-600"
            />
            <button
              type="submit"
              className="bg-white text-black px-6 py-2 rounded font-bold hover:bg-gray-200 transition-colors"
            >
              Go
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto p-4 max-w-4xl pt-8">
        <p className="text-gray-500 mb-6 text-sm">
          Found {data.total?.toLocaleString("en-US")} packages for "
          <span className="text-white">{q}</span>"
        </p>

        <div className="space-y-4">
          {results.map((item) => (
            <div
              key={item.package.name}
              className="border border-gray-800 p-5 rounded-lg hover:border-brand/50 hover:bg-gray-900/30 transition-all group"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-100 group-hover:text-brand transition-colors">
                    {item.package.name}
                  </h2>
                  {item.package.name.toLowerCase() ===
                    q.trim().toLowerCase() && (
                    <span className="bg-brand/20 text-brand border border-brand/30 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                      Exact
                    </span>
                  )}
                </div>
                <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
                  v{item.package.version}
                </span>
              </div>

              <p className="text-gray-400 mt-2 text-sm leading-relaxed line-clamp-2">
                {item.package.description}
              </p>

              {/* === BOTTOM SECTION: Links & Exact Downloads === */}
              <div className="mt-4 flex items-center justify-between border-t border-gray-800/50 pt-4">
                <div className="flex gap-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <a
                    href={item.package.links.npm}
                    target="_blank"
                    className="hover:text-white transition-colors"
                  >
                    NPM ↗
                  </a>
                  {item.package.links.homepage && (
                    <a
                      href={item.package.links.homepage}
                      target="_blank"
                      className="hover:text-white transition-colors"
                    >
                      Homepage ↗
                    </a>
                  )}
                </div>

                {/* EXACT WEEKLY DOWNLOADS */}
                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-mono">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4 text-brand"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                    />
                  </svg>

                  <span>
                    {item.weeklyDownloads
                      ? `${formatDownloads(item.weeklyDownloads)} /wk`
                      : "NA"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
