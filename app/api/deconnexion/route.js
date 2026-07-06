import { NextResponse } from "next/server";
import { supprimerSession } from "../../../lib/session";

export async function POST() {
  supprimerSession();
  return NextResponse.json({ ok: true });
}
