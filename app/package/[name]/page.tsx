interface NpmPackage {
  name: string;
  description: string;
  readme?: string;
  license?: string;
  homepage?: string;
  "dist-tags": {
    latest: string;
  };
  repository?: {
    url: string;
  };
}

export default async function PackagePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;

  const decodedName = decodeURIComponent(name);
  const res = await fetch(`http://localhost:3000/api/package/${decodedName}`);

  if (!res.ok) {
    return (
      <div className="min-h-screen bg-black text-white flex justify-center items-center">
        <h1 className="text-2xl text-red-500">Package Not Found</h1>
      </div>
    );
  }

  const data: NpmPackage = await res.json();
  const latestVersion = data["dist-tags"]?.latest || "Unknown";

  return (
    <div className="min-h-screen bg-black text-white font-mono p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="border-b flex gap-3 border-gray-800 pb-6">
          <h1 className="text-4xl font-bold text-white "> {data.name}</h1>
          <div className="flex gap-3 text-sm text-gray-400 items-end">
            <span className="bg-gray-800 text-purple-400 px-2 py-1 rounded">
              v{latestVersion}
            </span>
          </div>
        </div>
        <p className="text-gray-300 text-lg mb-4">{data.description}</p>
      </div>

      <div className="bg-gray-900 border max-w-5xl mx-auto border-gray-700 rounded-lg p-4 flex items-center justify-between">
        <code className="text-purple-400 text-lg "> npm i {data.name} </code>
        <button className="text-xs bg-black border border-gray-700 px-3 py-2 rounded hover:bg-gray-800 transition">
          Copy
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8 mt-4">
        <div className="flex-1 bg-gray-900/50 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-purple-500">README</h2>
          <div className="text-gray-400 text-sm whitespace-pre-wrap">
            {data.readme ? data.readme : "No README available."}
          </div>
        </div>
      </div>
    </div>
  );
}
