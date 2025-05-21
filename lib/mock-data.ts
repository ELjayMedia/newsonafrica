// Mock data for fallback when API is not available
export const FALLBACK_POSTS = [
  {
    id: "mock-1",
    title: "Africa's Economic Growth Surges in 2024",
    excerpt:
      "New report shows unprecedented economic growth across multiple African nations with investments in technology and infrastructure leading the way.",
    slug: "africas-economic-growth-2024",
    date: new Date().toISOString(),
    featuredImage: {
      sourceUrl: "/economic-growth-africa.png",
      altText: "Economic growth chart",
    },
    categories: [{ id: 1, name: "Business", slug: "business" }],
    author: { name: "John Doe", slug: "john-doe" },
  },
  {
    id: "mock-2",
    title: "Cultural Festival Celebrates Pan-African Unity",
    excerpt:
      "The annual festival brought together artists from across the continent to showcase the rich cultural heritage and promote unity among African nations.",
    slug: "cultural-festival-pan-african-unity",
    date: new Date().toISOString(),
    featuredImage: {
      sourceUrl: "/african-cultural-festival.png",
      altText: "Cultural festival",
    },
    categories: [{ id: 2, name: "Culture", slug: "culture" }],
    author: { name: "Jane Smith", slug: "jane-smith" },
  },
  {
    id: "mock-3",
    title: "Tech Innovation Hub Opens in Nairobi",
    excerpt:
      "The new innovation hub aims to support startups across East Africa, providing resources, mentorship, and funding opportunities for tech entrepreneurs.",
    slug: "tech-innovation-hub-nairobi",
    date: new Date().toISOString(),
    featuredImage: {
      sourceUrl: "/nairobi-tech-hub.png",
      altText: "Tech innovation hub",
    },
    categories: [{ id: 3, name: "Technology", slug: "technology" }],
    author: { name: "David Kamau", slug: "david-kamau" },
  },
  {
    id: "mock-4",
    title: "African Football Stars Shine in European Leagues",
    excerpt:
      "African players continue to make their mark in top European football leagues, with several stars winning prestigious awards and breaking records.",
    slug: "african-football-stars-europe",
    date: new Date().toISOString(),
    featuredImage: {
      sourceUrl: "/placeholder-0t66k.png",
      altText: "Football players",
    },
    categories: [{ id: 4, name: "Sports", slug: "sports" }],
    author: { name: "Samuel Eto'o", slug: "samuel-etoo" },
  },
  {
    id: "mock-5",
    title: "Climate Change Initiatives Across Africa",
    excerpt:
      "African nations are leading innovative approaches to combat climate change, with renewable energy projects and conservation efforts gaining international recognition.",
    slug: "climate-change-initiatives-africa",
    date: new Date().toISOString(),
    featuredImage: {
      sourceUrl: "/placeholder-zz0l2.png",
      altText: "Solar panels in Africa",
    },
    categories: [{ id: 5, name: "Environment", slug: "environment" }],
    author: { name: "Wangari Maathai", slug: "wangari-maathai" },
  },
  {
    id: "mock-6",
    title: "African Fashion Week Showcases Emerging Designers",
    excerpt:
      "The continent's premier fashion event highlighted innovative designs that blend traditional African textiles with contemporary styles, attracting global attention.",
    slug: "african-fashion-week-designers",
    date: new Date().toISOString(),
    featuredImage: {
      sourceUrl: "/placeholder.svg?height=300&width=400&query=african%20fashion%20show",
      altText: "African fashion show",
    },
    categories: [{ id: 6, name: "Fashion", slug: "fashion" }],
    author: { name: "Aisha Mohammed", slug: "aisha-mohammed" },
  },
  {
    id: "mock-7",
    title: "Contemporary African Art Exhibition Opens in Paris",
    excerpt:
      "The groundbreaking exhibition features works from artists across the continent, challenging stereotypes and showcasing Africa's vibrant contemporary art scene.",
    slug: "african-art-exhibition-paris",
    date: new Date().toISOString(),
    featuredImage: {
      sourceUrl: "/placeholder.svg?height=300&width=400&query=african%20art%20exhibition",
      altText: "African art exhibition",
    },
    categories: [{ id: 7, name: "Arts", slug: "arts" }],
    author: { name: "Chinua Achebe", slug: "chinua-achebe" },
  },
  {
    id: "mock-8",
    title: "Healthcare Innovations Transforming Rural Communities",
    excerpt:
      "Mobile health clinics and telemedicine are revolutionizing healthcare access in remote areas of Africa, significantly improving health outcomes.",
    slug: "healthcare-innovations-rural-africa",
    date: new Date().toISOString(),
    featuredImage: {
      sourceUrl: "/placeholder.svg?height=300&width=400&query=mobile%20health%20clinic%20africa",
      altText: "Mobile health clinic",
    },
    categories: [{ id: 8, name: "Health", slug: "health" }],
    author: { name: "Dr. Matshidiso Moeti", slug: "matshidiso-moeti" },
  },
  {
    id: "mock-9",
    title: "Eco-Tourism Boom in East African Wildlife Reserves",
    excerpt:
      "Sustainable tourism initiatives are creating economic opportunities while protecting endangered species and habitats across East African nature reserves.",
    slug: "eco-tourism-east-africa",
    date: new Date().toISOString(),
    featuredImage: {
      sourceUrl: "/placeholder.svg?height=300&width=400&query=safari%20eco%20tourism",
      altText: "Safari eco-tourism",
    },
    categories: [{ id: 9, name: "Travel", slug: "travel" }],
    author: { name: "Nelson Mandela", slug: "nelson-mandela" },
  },
  {
    id: "mock-10",
    title: "African Film Industry Gains Global Recognition",
    excerpt:
      "Nollywood and other African film industries are experiencing unprecedented international success, with streaming platforms investing in original African content.",
    slug: "african-film-industry-global",
    date: new Date().toISOString(),
    featuredImage: {
      sourceUrl: "/placeholder.svg?height=300&width=400&query=african%20film%20production",
      altText: "African film production",
    },
    categories: [{ id: 10, name: "Entertainment", slug: "entertainment" }],
    author: { name: "Genevieve Nnaji", slug: "genevieve-nnaji" },
  },
  {
    id: "mock-11",
    title: "Political Reforms Strengthen Democracy Across the Continent",
    excerpt:
      "Several African nations are implementing significant political reforms, strengthening democratic institutions and improving governance structures.",
    slug: "political-reforms-africa-democracy",
    date: new Date().toISOString(),
    featuredImage: {
      sourceUrl: "/placeholder.svg?height=300&width=400&query=african%20election",
      altText: "African election",
    },
    categories: [{ id: 11, name: "Politics", slug: "politics" }],
    author: { name: "Kofi Annan", slug: "kofi-annan" },
  },
  {
    id: "mock-12",
    title: "Educational Technology Revolutionizing Learning in Africa",
    excerpt:
      "Innovative EdTech solutions are addressing educational challenges across Africa, providing quality learning resources to students in remote and underserved areas.",
    slug: "edtech-revolution-africa",
    date: new Date().toISOString(),
    featuredImage: {
      sourceUrl: "/placeholder.svg?height=300&width=400&query=education%20technology%20africa",
      altText: "Education technology in Africa",
    },
    categories: [{ id: 12, name: "Education", slug: "education" }],
    author: { name: "Fred Swaniker", slug: "fred-swaniker" },
  },
]

// Export mockHomepageData for homepage fallback
export const mockHomepageData = {
  featuredPosts: FALLBACK_POSTS.slice(0, 3),
  recentPosts: FALLBACK_POSTS.slice(3, 9),
  popularPosts: FALLBACK_POSTS.slice(0, 5).map((post) => ({
    ...post,
    viewCount: Math.floor(Math.random() * 10000) + 1000,
  })),
  categoryPosts: {
    business: FALLBACK_POSTS.filter((post) => post.categories.some((cat) => cat.slug === "business")).slice(0, 4),
    politics: FALLBACK_POSTS.filter((post) => post.categories.some((cat) => cat.slug === "politics")).slice(0, 4),
    sports: FALLBACK_POSTS.filter((post) => post.categories.some((cat) => cat.slug === "sports")).slice(0, 4),
    technology: FALLBACK_POSTS.filter((post) => post.categories.some((cat) => cat.slug === "technology")).slice(0, 4),
    entertainment: FALLBACK_POSTS.filter((post) => post.categories.some((cat) => cat.slug === "entertainment")).slice(
      0,
      4,
    ),
  },
  editorsPicks: FALLBACK_POSTS.slice(9, 12),
}
