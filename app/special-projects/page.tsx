import { StaticSpecialProjectsContent } from "@/components/StaticSpecialProjectsContent"
import dynamic from "next/dynamic"

// Dynamically import the client component with SSR disabled
const ClientSpecialProjectsContent = dynamic(
  () => import("@/components/ClientSpecialProjectsContent").then((mod) => mod.ClientSpecialProjectsContent),
  { ssr: false },
)

export default function SpecialProjectsPage() {
  return (
    <>
      {/* This static content will be rendered during build */}
      <StaticSpecialProjectsContent />

      {/* This will be replaced with the client component on the client side */}
      <div id="client-content" className="hidden">
        <ClientSpecialProjectsContent />
      </div>

      {/* Script to swap content on client side */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded', function() {
              document.querySelector('[id="client-content"]').classList.remove('hidden');
              document.querySelector('main > div > div:first-child').style.display = 'none';
            });
          `,
        }}
      />
    </>
  )
}
