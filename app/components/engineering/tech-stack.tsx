import {
  siNextdotjs,
  siPnpm,
  siReact,
  siTailwindcss,
  siTypescript,
  siUpstash,
  siVercel,
  siVitest,
} from "simple-icons";

type BrandIcon = {
  title: string;
  hex: string;
  path: string;
};

type StackItem = {
  name: string;
  role: string;
  icon?: BrandIcon;
  image?: string;
  imageTint?: string;
};

const STACK: StackItem[] = [
  { name: "Next.js", role: "framework", icon: siNextdotjs },
  { name: "React", role: "UI", icon: siReact },
  { name: "TypeScript", role: "types", icon: siTypescript },
  { name: "Tailwind CSS", role: "styling", icon: siTailwindcss },
  { name: "Upstash Redis", role: "cache", icon: siUpstash },
  { name: "Vercel", role: "hosting", icon: siVercel },
  { name: "pnpm", role: "packages", icon: siPnpm },
  {
    name: "Playwright",
    role: "e2e",
    image: "/tech/playwright.svg",
    imageTint: "bg-[#2ead3314]",
  },
  { name: "Vitest", role: "unit", icon: siVitest },
  {
    name: "Shiki",
    role: "highlighting",
    image: "/tech/shiki.svg",
    imageTint: "bg-[#4b997814]",
  },
];

function BrandMark({ item }: { item: StackItem }) {
  if (item.image) {
    return (
      // Static brand asset; no optimization needed.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.image}
        alt=""
        aria-hidden="true"
        width={24}
        height={24}
        className="h-6 w-6"
      />
    );
  }

  if (!item.icon) return null;

  const isDark = item.icon.hex === "000000";

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-6 w-6 ${isDark ? "text-text-primary" : ""}`}
      fill={isDark ? "currentColor" : `#${item.icon.hex}`}
    >
      <path d={item.icon.path} />
    </svg>
  );
}

export function TechStack() {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {STACK.map((item) => {
        const isDark = item.icon?.hex === "000000";
        const tint =
          item.imageTint ??
          (item.icon && !isDark ? `#${item.icon.hex}14` : undefined);

        return (
          <li
            key={item.name}
            className="flex min-w-0 items-center gap-3 rounded-[var(--radius-sm)] border border-border-subtle bg-surface p-3 transition-colors duration-150 ease-out hover:border-border-strong"
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border-subtle ${
                isDark ? "bg-surface-raised" : ""
              }`}
              style={tint ? { backgroundColor: tint } : undefined}
            >
              <BrandMark item={item} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-mono text-[12px] text-text-primary">
                {item.name}
              </p>
              <p className="truncate font-mono text-[9px] uppercase tracking-[0.08em] text-text-muted">
                {item.role}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
