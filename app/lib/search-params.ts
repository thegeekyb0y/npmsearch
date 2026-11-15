import { z } from "zod";
import { MAX_QUERY_LENGTH, MIN_QUERY_LENGTH } from "./search-query";

const searchParamsSchema = z.object({
  q: z
    .string()
    .trim()
    .min(
      MIN_QUERY_LENGTH,
      `searches need at least ${MIN_QUERY_LENGTH} characters`,
    )
    .max(MAX_QUERY_LENGTH, `searches are limited to ${MAX_QUERY_LENGTH} characters`),
  from: z.coerce.number().int().min(0).max(10_000).default(0),
  size: z.coerce.number().int().min(1).max(250).default(20),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

export type ParseSearchParamsResult =
  | { ok: true; value: SearchParams }
  | { ok: false; message: string };

export function parseSearchParams(
  input: URLSearchParams,
): ParseSearchParamsResult {
  const parsed = searchParamsSchema.safeParse({
    q: input.get("q") ?? undefined,
    from: input.get("from") ?? undefined,
    size: input.get("size") ?? undefined,
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      message: issue
        ? `${issue.path.join(".") || "query"}: ${issue.message}`
        : "Invalid search parameters",
    };
  }

  return { ok: true, value: parsed.data };
}
