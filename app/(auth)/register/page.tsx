import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/auth/register-form";
import { getUser } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/validation";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a News on Africa account.",
};

/** Registration page (NOA-97). Signed-in visitors skip straight through. */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);

  const user = await getUser();
  if (user) redirect(next);

  return <RegisterForm next={next === "/" ? undefined : next} />;
}
