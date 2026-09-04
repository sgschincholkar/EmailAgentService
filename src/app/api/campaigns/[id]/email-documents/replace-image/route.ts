import { NextResponse } from "next/server";

import {
  EditConflictError,
  EditFailedError,
  EditNotFoundError,
  EditValidationError,
} from "@/generation/apply-email-document-edit";
import { ReplaceImageRequestSchema } from "@/generation/replace-image-request-schema";
import { replaceEmailDocumentImage } from "@/generation/replace-email-document-image";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: campaignId } = await params;

  const body = await request.json().catch(() => null);
  const parsed = ReplaceImageRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the highlighted details and try again." },
      { status: 400 },
    );
  }

  try {
    const document = await replaceEmailDocumentImage(
      campaignId,
      parsed.data.baseDocumentId,
      parsed.data.expectedVersion,
      parsed.data.assetId,
    );
    return NextResponse.json(
      { documentId: document.id, version: document.version },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof EditNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof EditConflictError) {
      return NextResponse.json(
        { error: error.message, latestVersion: error.latestVersion },
        { status: 409 },
      );
    }
    if (error instanceof EditValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof EditFailedError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
