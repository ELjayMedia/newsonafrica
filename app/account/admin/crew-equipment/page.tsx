import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Crew & equipment register",
  description: "Manage editorial crew and media equipment.",
};

const AVAILABILITY_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  available: "default",
  on_assignment: "secondary",
  unavailable: "outline",
  leave: "outline",
};

const EQUIPMENT_STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  available: "default",
  assigned: "secondary",
  maintenance: "outline",
  retired: "outline",
  lost: "outline",
};

export default async function AdminCrewEquipmentPage() {
  await requireAdmin("/account/admin/crew-equipment");

  const supabase = createAdminClient();

  const { data: crew } = await supabase
    .from("crew_members")
    .select("*")
    .order("full_name", { ascending: true });

  const { data: equipment } = await supabase
    .from("equipment")
    .select("*")
    .order("asset_tag", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="heading-lg">Crew & equipment register</h1>
        <p className="body-sm mt-1 text-muted-foreground">
          Manage editorial crew assignments and media equipment inventory.
        </p>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Crew members</h2>
          <Link
            href="/account/admin/crew-equipment/crew/new"
            className="ui-sm rounded-md bg-primary px-4 py-2 text-primary-foreground"
          >
            Add crew member
          </Link>
        </div>

        {!crew || crew.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="body-md text-muted-foreground">No crew members registered yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {crew.map((member) => (
              <Card key={member.id}>
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{member.full_name}</span>
                    <Badge
                      variant={
                        member.availability
                          ? AVAILABILITY_VARIANT[member.availability] || "outline"
                          : "outline"
                      }
                    >
                      {member.availability ?? "unknown"}
                    </Badge>
                  </div>
                  <p className="body-sm text-muted-foreground">{member.role}</p>
                  {member.skills && member.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {member.skills.map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Equipment</h2>
          <Link
            href="/account/admin/crew-equipment/equipment/new"
            className="ui-sm rounded-md bg-primary px-4 py-2 text-primary-foreground"
          >
            Add equipment
          </Link>
        </div>

        {!equipment || equipment.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="body-md text-muted-foreground">No equipment registered yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {equipment.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-medium">{item.asset_tag}</span>
                    <Badge variant={EQUIPMENT_STATUS_VARIANT[item.status] || "outline"}>
                      {item.status}
                    </Badge>
                  </div>
                  <p className="body-md font-medium">{item.name}</p>
                  <p className="body-sm text-muted-foreground">
                    {item.manufacturer} {item.model}
                  </p>
                  <p className="body-sm text-muted-foreground">SN: {item.serial_number}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
