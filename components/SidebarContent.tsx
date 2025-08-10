import MostRead from "./most-read"

export function SidebarContent() {
  return (
    <aside aria-label="Sidebar" className="w-full space-y-6">
      <MostRead limit={5} />
    </aside>
  )
}

export default SidebarContent
