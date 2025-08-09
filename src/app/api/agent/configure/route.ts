import { NextRequest, NextResponse } from "next/server";

const ORCH_URL = process.env.ORCH_URL || "http://127.0.0.1:8001";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Do not log secrets
    const resp = await fetch(`${ORCH_URL}/configure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return NextResponse.json({ ok: false, error: txt }, { status: resp.status });
    }
    const data = await resp.json();
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}


