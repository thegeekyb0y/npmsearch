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
      <div className="min-h-screen bg-black text-bwhite flex items-center justify-center">
        <p className="text-gray-300">Enter a search query first.</p>
      </div>
    );
  }

  const res = await fetch(`http://localhost:3000/api/search?q=${q}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return <div className="text-red-500 p-10">Error loading results</div>;
  }

  const data: SearchResponse = await res.json();
  // Safe check agar results undefined aaye API se
  const results = data.results || [];

  return (
    <div className="min-h-screen bg-black text-bwhite font-mono">
      <header className="border-b border-gray-800 p-4">
        <div className="max-w-4xl mx-auto">
          <form method="GET" action="/search" className="flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="/ search packages"
              className="font-mono px-4 py-2 bg-gray-900 text-white rounded border border-gray-700 outline-none focus:border-white w-full max-w-sm"
            />
            <button
              type="submit"
              className="bg-white text-black px-6 py-2 rounded font-bold hover:bg-gray-200"
            >
              search
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto p-4 max-w-4xl">
        <p className="text-gray-400 mb-6 italic">
          Found {data.total?.toLocaleString()} Packages
        </p>

        <div className="space-y-4">
          {results.map((item) => (
            <div
              key={item.package.name}
              className="border border-gray-800 p-4 rounded bg-gray-900/50 hover:border-gray-500 transition-colors"
            >
              {/* Package Name & Version */}
              <h2 className="text-xl font-bold">
                {item.package.name}{" "}
                <span className="text-sm text-gray-500">
                  v{item.package.version}
                </span>
              </h2>

              {/* Description */}
              <p className="text-gray-300 mt-2">{item.package.description}</p>

              {/* Links */}
              <div className="mt-4">
                <a
                  href={item.package.links.npm}
                  className="text-blue-400 hover:text-blue-300 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  View on NPM
                </a>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
