import "dotenv/config";
import { client } from "./client";
import fs from "node:fs";
import path from "node:path";

async function run() {
  const BASE_PATH = "src/db/migrations";

  const migrations = [`001_fts.sql`, `002_config.sql`];

  for (const migration of migrations) {
    const file = path.join(process.cwd(), `${BASE_PATH}/${migration}`);
    const sql = fs.readFileSync(file, "utf8");
    await client.executeMultiple(sql);
    console.log(`Successfully applied ${migration} ✓`);
  }
}

run();
