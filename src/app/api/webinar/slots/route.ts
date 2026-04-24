import { NextResponse } from "next/server";
import { listActiveSlots } from "@/lib/webinar/slots";

export async function GET() {
  const slots = await listActiveSlots();
  return NextResponse.json({ slots });
}
