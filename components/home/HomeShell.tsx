import type { WordPressPost } from '@/lib/api/wordpress'
import { categoryConfigs } from '@/config/homeConfig'
import { TopStory } from './TopStory'
import { CategoryRail } from './CategoryRail'
import { SponsoredRail } from './SponsoredRail'
import { Aside } from './Aside'
import { SecondaryStories } from '@/components/SecondaryStories'
import { VerticalCard } from '@/components/VerticalCard'

interface Props {
  topStory: WordPressPost | null
  secondaryPosts?: WordPressPost[]
  verticalPosts?: WordPressPost[]
  categoryPosts: Record<string, WordPressPost[]>
}

export function HomeShell({
  topStory,
  secondaryPosts = [],
  verticalPosts = [],
  categoryPosts,
}: Props) {
  const sortedConfigs = [...categoryConfigs].sort(
    (a, b) => (a.priority || 0) - (b.priority || 0),
  )
  return (
    <div className="mx-auto max-w-[1280px] px-3 md:px-6 space-y-6">
      <TopStory post={topStory} />
      <SponsoredRail />
      {secondaryPosts.length > 0 && (
        <SecondaryStories posts={secondaryPosts} layout="horizontal" />
      )}
      {verticalPosts.length > 0 && (
        <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {verticalPosts.map((post) => (
            <VerticalCard key={post.id} post={post} />
          ))}
        </section>
      )}
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
