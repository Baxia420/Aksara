import { NextResponse } from "next/server";

import { getAcademicSheetData } from "@/lib/academic-sheet";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getAcademicSheetData();
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read Google Sheet.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
