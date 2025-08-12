import type { WordPressPost } from '@/lib/api/wordpress'
import { categoryConfigs } from '@/config/homeConfig'
import { TopStory } from './TopStory'
import { CategoryRail } from './CategoryRail'
import { SponsoredRail } from './SponsoredRail'
import { Aside } from './Aside'

interface Props {
  topStory: WordPressPost | null
  categoryPosts: Record<string, WordPressPost[]>
  categories: any[]
}

export function HomeShell({ topStory, categoryPosts }: Props) {
  const sortedConfigs = [...categoryConfigs].sort(
    (a, b) => (a.priority || 0) - (b.priority || 0),
  )
  return (
    <div className="mx-auto max-w-[1280px] px-3 md:px-6 space-y-6">
      <TopStory post={topStory} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <main className="lg:col-span-8 space-y-6">
          {sortedConfigs.map((config) => (
            <div key={config.slug} className="space-y-6">
              <CategoryRail
                title={config.name}
                slug={config.slug}
                layout={config.layout}
                posts={categoryPosts[config.slug] || []}
              />
              {config.showAdAfter && <SponsoredRail />}
            </div>
          ))}
        </main>
        <aside className="lg:col-span-4 space-y-6">
          <Aside />
        </aside>
      </div>
    </div>
  )
}
