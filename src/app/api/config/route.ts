import { NextRequest, NextResponse } from "next/server";
import { client } from "@/db/client";

export async function GET() {
  const r = await client.execute("SELECT * FROM app_config WHERE id='default'");
  return NextResponse.json(r.rows[0] ?? null);
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || token !== process.env.DEMO_ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const b = await req.json();
  const { w_backend, w_leadership, w_scaling, th_advance, th_hold_min } = b;
  await client.execute({
    sql: `UPDATE app_config SET
      w_backend=?1, w_leadership=?2, w_scaling=?3,
      th_advance=?4, th_hold_min=?5
      WHERE id='default'`,
    args: [w_backend, w_leadership, w_scaling, th_advance, th_hold_min],
  });
  return NextResponse.json({ ok: true });
}
