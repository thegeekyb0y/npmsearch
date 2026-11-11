import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).optional(),
);

const optionalUrl = z.preprocess(
  emptyToUndefined,
  z.string().trim().url().optional(),
);

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: optionalString,
  GITHUB_TOKEN: optionalString,
  NEXT_PUBLIC_BASE_URL: optionalUrl,
});

export type Env = z.infer<typeof envSchema>;
export type EnvSource = Record<string, string | undefined>;

export function parseEnv(source: EnvSource = process.env): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${issues}`);
  }

  return result.data;
}

let cachedEnv: Env | undefined;

export function getEnv(): Env {
  cachedEnv ??= parseEnv();
  return cachedEnv;
}

export function hasRedisEnv(env: Env = getEnv()): boolean {
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}

export function getGithubToken(): string | undefined {
  return getEnv().GITHUB_TOKEN;
}
