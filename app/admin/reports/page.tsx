import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"

export default async function ReportsPage() {
  const supabase = createClient(cookies())
  const { data } = await supabase
    .from("payments")
    .select("reference,amount,status,created_at,subscriptions(user_id)")
    .order("created_at", { ascending: false })

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Subscribers &amp; Payers</h1>
      <div className="mb-4" />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="p-2">User</th>
            <th className="p-2">Reference</th>
            <th className="p-2">Amount</th>
            <th className="p-2">Status</th>
            <th className="p-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((p) => (
            <tr key={p.reference} className="border-t">
              <td className="p-2">{p.subscriptions?.user_id}</td>
              <td className="p-2">{p.reference}</td>
              <td className="p-2">{p.amount}</td>
              <td className="p-2">{p.status}</td>
              <td className="p-2">{new Date(p.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <a href="/api/admin/export-payments" className="underline mt-4 inline-block">
        Export CSV
      </a>
    </div>
  )
}
