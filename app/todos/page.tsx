import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export default async function Page() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data: todos } = await supabase.from("todos").select()

  return (
    <ul className="space-y-2 p-4">
      {todos?.map((todo) => (
        <li key={todo.id} className="p-2 bg-white rounded shadow">
          {todo.title || todo.task || JSON.stringify(todo)}
        </li>
      ))}
      {!todos?.length && <li className="text-gray-500">No todos found. Create some in your Supabase dashboard.</li>}
    </ul>
  )
}
