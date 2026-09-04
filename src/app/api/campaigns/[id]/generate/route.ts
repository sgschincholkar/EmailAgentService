import { NextResponse } from "next/server";

import { GenerationFailedError, generateCampaignEmail } from "@/generation/generate-campaign-email";
import { PreflightError } from "@/generation/preflight-check";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  try {
    const document = await generateCampaignEmail(id);
    return NextResponse.json({ emailDocumentId: document.id }, { status: 201 });
  } catch (error) {
    if (error instanceof PreflightError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof GenerationFailedError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json({ error: "Generation failed. Try again." }, { status: 500 });
  }
}
