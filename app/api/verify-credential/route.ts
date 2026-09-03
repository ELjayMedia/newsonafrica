import { NextResponse, type NextRequest } from "next/server";

import { verifyCredential } from "@/lib/press-credentials/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/verify-credential
 * Public endpoint for verifying press credentials via QR code scan.
 * Body: { credentialNumber: string }
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const credentialNumber = body.credentialNumber?.trim();

  if (!credentialNumber) {
    return NextResponse.json({ error: "credentialNumber is required" }, { status: 400 });
  }

  const result = await verifyCredential(credentialNumber);

  if (!result.valid) {
    return NextResponse.json(
      {
        valid: false,
        status: result.status || "not_found",
        message: result.error || "Credential is not valid",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    valid: true,
    credentialNumber: result.credentialNumber,
    holderName: result.holderName,
    role: result.role,
    expiryDate: result.expiryDate,
  });
}

export async function GET() {
  return NextResponse.json({
    message: "Credential verification endpoint. Send POST with { credentialNumber }.",
  });
}
