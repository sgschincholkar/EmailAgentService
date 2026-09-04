import { NextResponse } from "next/server";
import { z } from "zod";

import {
  EditConflictError,
  EditFailedError,
  EditNotFoundError,
  EditValidationError,
} from "@/generation/apply-email-document-edit";
import { restoreEmailDocumentVersion } from "@/generation/restore-email-document-version";

const RestoreRequestSchema = z.object({
  sourceDocumentId: z.string().min(1),
  expectedVersion: z.number().int().positive(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: campaignId } = await params;

  const body = await request.json().catch(() => null);
  const parsed = RestoreRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid restore request." }, { status: 400 });
  }

  try {
    const document = await restoreEmailDocumentVersion(
      campaignId,
      parsed.data.sourceDocumentId,
      parsed.data.expectedVersion,
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
