import Link from "next/link"
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function Footer() {
  return (
    <footer className="bg-black text-white py-2 mt-2 hidden md:block">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-2 md:gap-4">
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
        </div>
        <div className="mt-2 pt-2 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-2 md:mb-0">
              <p className="text-[10px]">&copy; {new Date().getFullYear()} News On Africa. All rights reserved.</p>
            </div>
            <div className="flex space-x-2">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">
                <Facebook size={20} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">
                <Twitter size={20} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">
                <Instagram size={20} />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">
                <Linkedin size={20} />
              </a>
            </div>
            <Link href="/sitemap.xml" className="text-[10px] hover:text-gray-300">
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
