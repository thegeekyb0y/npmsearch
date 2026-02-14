export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="font-bold text-5xl text-center font-sans text-white py-4 ">
        npmSearch
      </h1>
      <p className="text-muted text-lg mb-12 italic">
        a better browser for the npm registry
      </p>
      <form action="/search" method="GET">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="/ search packages"
            name="q"
            autoFocus
            className="text-white px-4 py-4 rounded-sm border-0 hover:border bg-gray-800 "
          ></input>
          <button
            type="submit"
            className="text-white bg-gray-500 px-2 font-medium hover:bg-gray-600 transition rounded-sm"
          >
            Search
          </button>
        </div>
      </form>

      <div className="mt-16 flex gap-4 text-muted  text-sm">
        <a href="/package/react" className="hover:text-white">
          react
        </a>
        <span>•</span>
        <a href="/package/next" className="hover:text-white">
          next
        </a>
        <span>•</span>
        <a href="/package/vue" className="hover:text-white">
          vue
        </a>
        <span>•</span>
        <a href="/package/typescript" className="hover:text-white">
          typescript
        </a>
      </div>
    </div>
  );
}
