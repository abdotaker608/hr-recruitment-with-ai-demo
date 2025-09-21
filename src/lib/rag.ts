import { client } from "@/db/client";

export type RAGContext = { jd: string[]; cv: string[]; qs: string[] };

export async function retrieveContext({
  query,
  kJD = 4,
  kCV = 3,
  kQ = 3,
}: {
  query: string;
  kJD?: number;
  kCV?: number;
  kQ?: number;
}): Promise<RAGContext> {
  const q = sanitizeForFts(query);
  const jd = await fts({ ownerType: "job", term: q, limit: kJD });
  const cv = await fts({ ownerType: "candidate", term: q, limit: kCV });
  const qs = await fts({ ownerType: "question", term: q, limit: kQ });
  return { jd, cv, qs };
}

function sanitizeForFts(input: string) {
  // Remove characters that have special meaning in FTS5 MATCH syntax
  // (column qualifiers, wildcards, phrase operators, etc.)
  return (input || "")
    .toLowerCase()
    .replace(/[:^*"'(){}[\]]/g, " ") // <- key: remove colon
    .replace(/\s+/g, " ")
    .trim();
}

async function fts({
  ownerType,
  term,
  limit = 3,
}: {
  ownerType: "job" | "candidate" | "question";
  term: string;
  limit?: number;
}): Promise<string[]> {
  // If term ended up empty, just return the latest few rows for that ownerType
  if (!term) {
    const r = await client.execute({
      sql: `SELECT content FROM search_index WHERE owner_type = ?1 LIMIT ?2`,
      args: [ownerType, limit],
    });
    return r.rows.map((row: any) => String(row.content));
  }

  // Filter owner_type in WHERE, not inside MATCH. Wrap term in quotes to avoid accidental operators.
  const r = await client.execute({
    sql: `SELECT content
          FROM search_index
          WHERE owner_type = ?1
            AND search_index MATCH ?2
          LIMIT ?3`,
    args: [ownerType, `"${term}"`, limit],
  });

  return r.rows.map((row: any) => String(row.content));
}
