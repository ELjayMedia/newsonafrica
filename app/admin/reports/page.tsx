import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"

export default async function ReportsPage({ searchParams }: { searchParams: { type?: string } }) {
  const type = searchParams.type
  const supabase = createClient(cookies())
  let query = supabase
    .from("payments")
    .select("user_id,type,reference,amount,status,created_at")
    .order("created_at", { ascending: false })
  if (type) {
    query = query.eq("type", type)
  }
  const { data } = await query

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Subscribers &amp; Payers</h1>
      <div className="space-x-2 mb-4">
        <a href="/admin/reports" className="underline">
          All
        </a>
        <a href="/admin/reports?type=subscription" className="underline">
          Subscriptions
        </a>
        <a href="/admin/reports?type=gift" className="underline">
          Article Gifts
        </a>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="p-2">User</th>
            <th className="p-2">Type</th>
            <th className="p-2">Reference</th>
            <th className="p-2">Amount</th>
            <th className="p-2">Status</th>
            <th className="p-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((p) => (
            <tr key={p.reference} className="border-t">
              <td className="p-2">{p.user_id}</td>
              <td className="p-2 capitalize">{p.type}</td>
              <td className="p-2">{p.reference}</td>
              <td className="p-2">{p.amount}</td>
              <td className="p-2">{p.status}</td>
              <td className="p-2">{new Date(p.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <a
        href={`/api/admin/export-payments${type ? `?type=${type}` : ""}`}
        className="underline mt-4 inline-block"
      >
        Export CSV
      </a>
    </div>
  )
}
