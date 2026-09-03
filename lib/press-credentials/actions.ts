"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";

export interface PressCredentialInput {
  holderName: string;
  holderEmail?: string;
  holderPhone?: string;
  role: "journalist" | "editor" | "photographer" | "videographer" | "freelancer" | "contributor";
  department?: string;
  photoUrl?: string;
  expiryDate: string;
  notes?: string;
}

export async function createPressCredential(input: PressCredentialInput) {
  await requireAdmin();

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("press_credentials")
    .insert({
      holder_name: input.holderName,
      holder_email: input.holderEmail,
      holder_phone: input.holderPhone,
      role: input.role,
      department: input.department,
      photo_url: input.photoUrl,
      expiry_date: input.expiryDate,
      notes: input.notes,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, credential: data };
}

export async function updatePressCredentialStatus(
  id: string,
  status: "active" | "expired" | "suspended" | "revoked" | "lost" | "stolen"
) {
  await requireAdmin();

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("press_credentials")
    .update({ status })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deletePressCredential(id: string) {
  await requireAdmin();

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("press_credentials")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function verifyCredential(credentialNumber: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("press_credentials")
    .select("*")
    .eq("credential_number", credentialNumber)
    .maybeSingle();

  if (error || !data) {
    return { valid: false, error: "Credential not found" };
  }

  const now = new Date();
  const expiry = new Date(data.expiry_date);

  if (data.status !== "active" || expiry < now) {
    return {
      valid: false,
      status: data.status,
      expiryDate: data.expiry_date,
      holderName: data.holder_name,
      role: data.role,
    };
  }

  // Log verification
  await supabase.from("credential_verifications").insert({
    credential_id: data.id,
    verification_method: "api",
    result: "valid",
  });

  return {
    valid: true,
    credentialNumber: data.credential_number,
    holderName: data.holder_name,
    role: data.role,
    expiryDate: data.expiry_date,
  };
}
