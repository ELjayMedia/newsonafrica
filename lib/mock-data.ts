// Mock data for offline fallback functionality

export interface MockPost {
  id: number
  slug: string
  title: {
    rendered: string
  }
  excerpt: {
    rendered: string
  }
  content: {
    rendered: string
  }
  date: string
  modified: string
  featured_media: number
  featured_image_url?: string
  categories: number[]
  tags: number[]
  author: number
  author_name?: string
  _embedded?: {
    author?: Array<{
      id: number
      name: string
      avatar_urls?: {
        [key: string]: string
      }
    }>
    "wp:featuredmedia"?: Array<{
      id: number
      source_url: string
      media_details?: {
        sizes?: {
          [key: string]: {
            source_url: string
          }
        }
      }
    }>
    "wp:term"?: Array<
      Array<{
        id: number
        name: string
        slug: string
      }>
    >
  }
}

// Fallback posts for offline mode
export const FALLBACK_POSTS: MockPost[] = [
  {
    id: 1,
    slug: "economic-growth-in-east-africa",
    title: {
      rendered: "Economic Growth Surges in East African Region",
    },
    excerpt: {
      rendered:
        "East African economies show remarkable resilience with growth rates exceeding expectations despite global challenges.",
    },
    content: {
      rendered:
        "<p>East African economies have demonstrated remarkable resilience in the face of global economic headwinds, with several countries in the region posting growth rates that exceed earlier projections.</p><p>Kenya, Tanzania, and Rwanda are leading the pack with robust expansion in key sectors including technology, agriculture, and infrastructure development.</p><p>Analysts attribute this growth to strategic investments, regional integration efforts, and improved governance frameworks that have created a more conducive environment for both local and international investors.</p>",
    },
    date: "2023-11-15T09:30:00",
    modified: "2023-11-15T10:15:00",
    featured_media: 101,
    featured_image_url: "/economic-growth-africa.png",
    categories: [1, 3],
    tags: [5, 8, 12],
    author: 5,
    author_name: "Amina Kofi",
    _embedded: {
      author: [
        {
          id: 5,
          name: "Amina Kofi",
          avatar_urls: {
            "96": "/placeholder.png",
          },
        },
      ],
      "wp:featuredmedia": [
        {
          id: 101,
          source_url: "/economic-growth-africa.png",
          media_details: {
            sizes: {
              medium: {
                source_url: "/economic-growth-africa.png",
              },
              thumbnail: {
                source_url: "/economic-growth-africa.png",
              },
            },
          },
        },
      ],
      "wp:term": [
        [
          {
            id: 1,
            name: "Business",
            slug: "business",
          },
          {
            id: 3,
            name: "Economy",
            slug: "economy",
          },
        ],
      ],
    },
  },
  {
    id: 2,
    slug: "tech-innovation-nairobi",
    title: {
      rendered: "Nairobi Emerges as Africa's Leading Tech Hub",
    },
    excerpt: {
      rendered:
        "Kenya's capital is attracting global attention as startups and tech giants establish regional headquarters in the city.",
    },
    content: {
      rendered:
        "<p>Nairobi is rapidly cementing its position as Africa's premier technology hub, with an influx of startups and established tech companies setting up operations in the Kenyan capital.</p><p>The city's vibrant ecosystem now hosts over 200 active startups, multiple co-working spaces, and innovation labs backed by global tech giants including Google, Microsoft, and IBM.</p><p>Government initiatives such as the Konza Technopolis project and favorable regulatory frameworks have played a crucial role in fostering this growth, positioning Kenya at the forefront of Africa's digital revolution.</p>",
    },
    date: "2023-11-10T14:20:00",
    modified: "2023-11-10T16:45:00",
    featured_media: 102,
    featured_image_url: "/nairobi-tech-hub.png",
    categories: [2, 7],
    tags: [9, 14, 18],
    author: 8,
    author_name: "David Ochieng",
    _embedded: {
      author: [
        {
          id: 8,
          name: "David Ochieng",
          avatar_urls: {
            "96": "/placeholder.png",
          },
        },
      ],
      "wp:featuredmedia": [
        {
          id: 102,
          source_url: "/nairobi-tech-hub.png",
          media_details: {
            sizes: {
              medium: {
                source_url: "/nairobi-tech-hub.png",
              },
              thumbnail: {
                source_url: "/nairobi-tech-hub.png",
              },
            },
          },
        },
      ],
      "wp:term": [
        [
          {
            id: 2,
            name: "Technology",
            slug: "technology",
          },
          {
            id: 7,
            name: "Innovation",
            slug: "innovation",
          },
        ],
      ],
    },
  },
  {
    id: 3,
    slug: "cultural-festival-west-africa",
    title: {
      rendered: "West African Cultural Festival Draws Record Attendance",
    },
    excerpt: {
      rendered:
        "The annual celebration of West African arts and culture sees unprecedented international participation.",
    },
    content: {
      rendered:
        "<p>The West African Cultural Festival has concluded its most successful edition to date, with record attendance figures and unprecedented international participation.</p><p>Held across multiple venues in Accra, Ghana, the two-week festival showcased the rich cultural heritage of the region through music, dance, visual arts, cuisine, and fashion.</p><p>Over 500,000 visitors, including a significant number of international tourists, participated in the festivities, generating an estimated $15 million in revenue for the local economy and highlighting the growing global interest in African cultural expressions.</p>",
    },
    date: "2023-11-05T11:00:00",
    modified: "2023-11-06T09:30:00",
    featured_media: 103,
    featured_image_url: "/african-cultural-festival.png",
    categories: [4, 6],
    tags: [22, 25, 28],
    author: 12,
    author_name: "Fatou Diallo",
    _embedded: {
      author: [
        {
          id: 12,
          name: "Fatou Diallo",
          avatar_urls: {
            "96": "/placeholder.png",
          },
        },
      ],
      "wp:featuredmedia": [
        {
          id: 103,
          source_url: "/african-cultural-festival.png",
          media_details: {
            sizes: {
              medium: {
                source_url: "/african-cultural-festival.png",
              },
              thumbnail: {
                source_url: "/african-cultural-festival.png",
              },
            },
          },
        },
      ],
      "wp:term": [
        [
          {
            id: 4,
            name: "Entertainment",
            slug: "entertainment",
          },
          {
            id: 6,
            name: "Culture",
            slug: "culture",
          },
        ],
      ],
    },
  },
  {
    id: 4,
    slug: "fashion-week-johannesburg",
    title: {
      rendered: "Johannesburg Fashion Week Showcases African Design Talent",
    },
    excerpt: {
      rendered:
        "Leading designers from across the continent present innovative collections blending traditional elements with contemporary styles.",
    },
    content: {
      rendered:
        "<p>Johannesburg Fashion Week has concluded to critical acclaim, with designers from across Africa presenting collections that highlight the continent's growing influence in the global fashion industry.</p><p>The event featured over 40 designers from 15 African countries, showcasing a diverse range of styles that blend traditional African textiles and techniques with contemporary design sensibilities.</p><p>Industry insiders noted the increasing commercial viability of African fashion, with several designers securing international distribution deals and collaborations with global brands during the event.</p>",
    },
    date: "2023-10-28T16:45:00",
    modified: "2023-10-29T10:20:00",
    featured_media: 104,
    featured_image_url: "/african-fashion-show.png",
    categories: [4, 9],
    tags: [31, 34, 37],
    author: 15,
    author_name: "Thabo Mbeki",
    _embedded: {
      author: [
        {
          id: 15,
          name: "Thabo Mbeki",
          avatar_urls: {
            "96": "/placeholder.png",
          },
        },
      ],
      "wp:featuredmedia": [
        {
          id: 104,
          source_url: "/african-fashion-show.png",
          media_details: {
            sizes: {
              medium: {
                source_url: "/african-fashion-show.png",
              },
              thumbnail: {
                source_url: "/african-fashion-show.png",
              },
            },
          },
        },
      ],
      "wp:term": [
        [
          {
            id: 4,
            name: "Entertainment",
            slug: "entertainment",
          },
          {
            id: 9,
            name: "Fashion",
            slug: "fashion",
          },
        ],
      ],
    },
  },
  {
    id: 5,
    slug: "art-exhibition-cairo",
    title: {
      rendered: "Contemporary African Art Exhibition Opens in Cairo",
    },
    excerpt: {
      rendered:
        "The exhibition features works from emerging and established artists exploring themes of identity, history, and social change.",
    },
    content: {
      rendered:
        '<p>A major exhibition of contemporary African art has opened at the Cairo Museum of Modern Art, featuring works from over 60 artists representing 25 countries across the continent.</p><p>Titled "Reimagining Africa," the exhibition explores themes of identity, historical narratives, social transformation, and environmental concerns through a diverse range of mediums including painting, sculpture, photography, video, and installation art.</p><p>Curators have emphasized the exhibition\'s role in challenging stereotypical representations of Africa and showcasing the diversity and sophistication of contemporary artistic expression across the continent.</p>',
    },
    date: "2023-10-20T13:15:00",
    modified: "2023-10-21T09:45:00",
    featured_media: 105,
    featured_image_url: "/african-art-exhibition.png",
    categories: [4, 10],
    tags: [40, 43, 46],
    author: 18,
    author_name: "Nadia Ibrahim",
    _embedded: {
      author: [
        {
          id: 18,
          name: "Nadia Ibrahim",
          avatar_urls: {
            "96": "/placeholder.png",
          },
        },
      ],
      "wp:featuredmedia": [
        {
          id: 105,
          source_url: "/african-art-exhibition.png",
          media_details: {
            sizes: {
              medium: {
                source_url: "/african-art-exhibition.png",
              },
              thumbnail: {
                source_url: "/african-art-exhibition.png",
              },
            },
          },
        },
      ],
      "wp:term": [
        [
          {
            id: 4,
            name: "Entertainment",
            slug: "entertainment",
          },
          {
            id: 10,
            name: "Art",
            slug: "art",
          },
        ],
      ],
    },
  },
]

// Mock homepage data structure
export const mockHomepageData = {
  featuredStory: FALLBACK_POSTS[0],
  topStories: FALLBACK_POSTS.slice(0, 3),
  latestNews: FALLBACK_POSTS.slice(1, 5),
  businessNews: FALLBACK_POSTS.filter((post) =>
    post._embedded?.["wp:term"]?.[0].some((term) => term.slug === "business"),
  ),
  technologyNews: FALLBACK_POSTS.filter((post) =>
    post._embedded?.["wp:term"]?.[0].some((term) => term.slug === "technology"),
  ),
  entertainmentNews: FALLBACK_POSTS.filter((post) =>
    post._embedded?.["wp:term"]?.[0].some((term) => term.slug === "entertainment"),
  ),
  editorsPicks: [FALLBACK_POSTS[2], FALLBACK_POSTS[4]],
  trending: [FALLBACK_POSTS[1], FALLBACK_POSTS[3]],
  categories: [
    { id: 1, name: "Business", slug: "business", count: 1 },
    { id: 2, name: "Technology", slug: "technology", count: 1 },
    { id: 3, name: "Economy", slug: "economy", count: 1 },
    { id: 4, name: "Entertainment", slug: "entertainment", count: 3 },
    { id: 6, name: "Culture", slug: "culture", count: 1 },
    { id: 7, name: "Innovation", slug: "innovation", count: 1 },
    { id: 9, name: "Fashion", slug: "fashion", count: 1 },
    { id: 10, name: "Art", slug: "art", count: 1 },
  ],
  tags: [
    { id: 5, name: "Economic Growth", slug: "economic-growth", count: 1 },
    { id: 8, name: "East Africa", slug: "east-africa", count: 1 },
    { id: 9, name: "Technology Hub", slug: "technology-hub", count: 1 },
    { id: 14, name: "Startups", slug: "startups", count: 1 },
    { id: 22, name: "Cultural Festival", slug: "cultural-festival", count: 1 },
    { id: 31, name: "Fashion", slug: "fashion-design", count: 1 },
    { id: 40, name: "Contemporary Art", slug: "contemporary-art", count: 1 },
  ],
}
