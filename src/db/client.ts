import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

const url = process.env.DATABASE_URL!;
const authToken = process.env.DATABASE_AUTH_TOKEN;
console.log(url, authToken);
export const client = createClient({ url, authToken });
export const db = drizzle(client);
