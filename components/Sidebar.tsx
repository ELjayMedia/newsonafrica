import { Suspense } from "react"
import { SidebarContent } from "./SidebarContent"
import { SidebarSkeleton } from "./SidebarSkeleton"
import { AdSense } from "@/components/AdSense"
import { AdErrorBoundary } from "@/components/AdErrorBoundary"
import Link from "next/link"
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function Sidebar() {
  return (
    <aside className="hidden md:block w-full max-w-xs space-y-6">
      {/* Main sidebar content */}
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarContent />
      </Suspense>

      {/* Third AdSense ad at the bottom of sidebar */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <AdErrorBoundary collapse={true}>
          <AdSense slot="8721564553" format="rectangle" className="w-full min-w-[300px] h-[250px]" />
        </AdErrorBoundary>
      </div>

      {/* Footer content moved to sidebar */}
      <div className="bg-black text-white p-4 rounded-lg">
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-semibold mb-1">Subscribe</h3>
            <p className="text-[10px] mb-2">Stay updated with our latest news and offers.</p>
            <form className="flex flex-col space-y-2">
              <Input
                type="email"
                placeholder="Enter your email"
                className="bg-gray-800 text-white border-gray-700 text-[10px]"
              />
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-[10px]">
                Subscribe
              </Button>
            </form>
          </div>

          <div className="pt-2 border-t border-gray-800">
            <div className="flex flex-col space-y-2">
              <div>
                <p className="text-[10px]">&copy; {new Date().getFullYear()} News On Africa. All rights reserved.</p>
              </div>
              <div className="flex space-x-2">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-300"
                >
                  <Facebook size={16} />
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">
                  <Twitter size={16} />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-300"
                >
                  <Instagram size={16} />
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-300"
                >
                  <Linkedin size={16} />
                </a>
              </div>
              <Link href="/sitemap.xml" className="text-[10px] hover:text-gray-300">
                Sitemap
              </Link>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
