import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Press credentials",
  description: "Manage NOA press IDs and editorial crew.",
};

interface PressCredential {
  id: string;
  credential_number: string;
  holder_name: string;
  role: string;
  status: string;
  issue_date: string;
  expiry_date: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  expired: "secondary",
  suspended: "outline",
  revoked: "outline",
  lost: "outline",
  stolen: "outline",
};

export default async function AdminPressCredentialsPage() {
  await requireAdmin("/account/admin/press-credentials");

  const supabase = createAdminClient();
  const { data: credentials } = await supabase
    .from("press_credentials")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="heading-lg">Press credentials</h1>
        <p className="body-sm mt-1 text-muted-foreground">
          Manage press ID cards and editorial crew credentials.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Link
          href="/account/admin/press-credentials/new"
          className="ui-sm rounded-md bg-primary px-4 py-2 text-primary-foreground"
        >
          Issue new credential
        </Link>
      </div>

      {!credentials || credentials.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="body-md text-muted-foreground">
              No press credentials issued yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {credentials.map((cred: PressCredential) => (
            <li key={cred.id} className="list-none">
              <Card>
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-medium">
                      {cred.credential_number}
                    </span>
                    <Badge variant={STATUS_VARIANT[cred.status] || "outline"}>
                      {cred.status}
                    </Badge>
                    <span className="body-sm text-muted-foreground">
                      {cred.role}
                    </span>
                  </div>
                  <p className="body-md font-medium">{cred.holder_name}</p>
                  <p className="body-sm text-muted-foreground">
                    Issued {new Date(cred.issue_date).toLocaleDateString()} · Expires{" "}
                    {new Date(cred.expiry_date).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </div>
      )}
    </div>
  );
}
