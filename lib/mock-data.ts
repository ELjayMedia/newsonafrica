export const mockHomepageData = {
  taggedPosts: [
    {
      id: "mock-fp-1",
      title: "Breaking: Major Development in African Politics",
      excerpt:
        "A significant political shift is occurring across the continent as new leadership emerges in several key nations...",
      slug: "breaking-major-development",
      date: new Date().toISOString(),
      featuredImage: {
        node: {
          sourceUrl: "/news-collage.png",
        },
      },
      author: {
        node: {
          name: "News On Africa Staff",
          slug: "staff",
        },
      },
      categories: {
        nodes: [{ name: "News", slug: "news" }],
      },
      tags: {
        nodes: [{ name: "Featured", slug: "fp" }],
      },
    },
    {
      id: "mock-fp-2",
      title: "Economic Growth Surges Across East Africa",
      excerpt: "Several East African nations are reporting unprecedented economic growth despite global challenges...",
      slug: "economic-growth-east-africa",
      date: new Date().toISOString(),
      featuredImage: {
        node: {
          sourceUrl: "/business-meeting-diversity.png",
        },
      },
      author: {
        node: {
          name: "Economic Analyst",
          slug: "analyst",
        },
      },
      categories: {
        nodes: [{ name: "Business", slug: "business" }],
      },
      tags: {
        nodes: [{ name: "Featured", slug: "fp" }],
      },
    },
    {
      id: "mock-fp-3",
      title: "Cultural Festival Celebrates Pan-African Unity",
      excerpt: "A major cultural festival bringing together artists from across the continent has begun in Nairobi...",
      slug: "cultural-festival-unity",
      date: new Date().toISOString(),
      featuredImage: {
        node: {
          sourceUrl: "/diverse-entertainment.png",
        },
      },
      author: {
        node: {
          name: "Culture Reporter",
          slug: "culture",
        },
      },
      categories: {
        nodes: [{ name: "Entertainment", slug: "entertainment" }],
      },
      tags: {
        nodes: [{ name: "Featured", slug: "fp" }],
      },
    },
    {
      id: "mock-fp-4",
      title: "Sports Tournament Showcases African Talent",
      excerpt: "The continental championship has begun with record participation from countries across Africa...",
      slug: "sports-tournament-talent",
      date: new Date().toISOString(),
      featuredImage: {
        node: {
          sourceUrl: "/diverse-group-playing-various-sports.png",
        },
      },
      author: {
        node: {
          name: "Sports Editor",
          slug: "sports",
        },
      },
      categories: {
        nodes: [{ name: "Sport", slug: "sport" }],
      },
      tags: {
        nodes: [{ name: "Featured", slug: "fp" }],
      },
    },
  ],
  featuredPosts: [
    {
      id: "mock-featured-1",
      title: "Opinion: The Future of Democracy in Africa",
      excerpt: "As several nations approach elections, experts weigh in on the state of democratic institutions...",
      slug: "future-democracy-africa",
      date: new Date().toISOString(),
      featuredImage: {
        node: {
          sourceUrl: "/editorial-image.png",
        },
      },
      author: {
        node: {
          name: "Political Analyst",
          slug: "analyst",
        },
      },
      categories: {
        nodes: [{ name: "Editorial", slug: "editorial" }],
      },
    },
    {
      id: "mock-featured-2",
      title: "Healthcare Innovations Transforming Rural Communities",
      excerpt: "New mobile health initiatives are bringing critical care to previously underserved regions...",
      slug: "healthcare-innovations-rural",
      date: new Date().toISOString(),
      featuredImage: {
        node: {
          sourceUrl: "/abstract-health.png",
        },
      },
      author: {
        node: {
          name: "Health Correspondent",
          slug: "health",
        },
      },
      categories: {
        nodes: [{ name: "Health", slug: "health" }],
      },
    },
    {
      id: "mock-featured-3",
      title: "Tech Startups Revolutionizing African Industries",
      excerpt: "A new wave of technology startups is transforming traditional sectors across the continent...",
      slug: "tech-startups-revolution",
      date: new Date().toISOString(),
      featuredImage: {
        node: {
          sourceUrl: "/business-meeting-diversity.png",
        },
      },
      author: {
        node: {
          name: "Tech Reporter",
          slug: "tech",
        },
      },
      categories: {
        nodes: [{ name: "Business", slug: "business" }],
      },
    },
    {
      id: "mock-featured-4",
      title: "Environmental Conservation Efforts Gain Momentum",
      excerpt: "Community-led initiatives to protect natural resources are showing promising results...",
      slug: "environmental-conservation",
      date: new Date().toISOString(),
      featuredImage: {
        node: {
          sourceUrl: "/news-collage.png",
        },
      },
      author: {
        node: {
          name: "Environmental Journalist",
          slug: "environment",
        },
      },
      categories: {
        nodes: [{ name: "News", slug: "news" }],
      },
    },
  ],
  categories: [
    {
      id: "mock-cat-1",
      name: "News",
      slug: "news",
      posts: {
        nodes: [
          {
            id: "mock-news-1",
            title: "Breaking: Major Development in African Politics",
            excerpt:
              "A significant political shift is occurring across the continent as new leadership emerges in several key nations...",
            slug: "breaking-major-development",
            date: new Date().toISOString(),
            featuredImage: {
              node: {
                sourceUrl: "/news-collage.png",
              },
            },
          },
          {
            id: "mock-news-2",
            title: "International Summit Focuses on African Development",
            excerpt:
              "Leaders from around the world gather to discuss partnership opportunities with African nations...",
            slug: "international-summit",
            date: new Date().toISOString(),
            featuredImage: {
              node: {
                sourceUrl: "/news-collage.png",
              },
            },
          },
        ],
      },
    },
    {
      id: "mock-cat-2",
      name: "Business",
      slug: "business",
      posts: {
        nodes: [
          {
            id: "mock-business-1",
            title: "Economic Growth Surges Across East Africa",
            excerpt:
              "Several East African nations are reporting unprecedented economic growth despite global challenges...",
            slug: "economic-growth-east-africa",
            date: new Date().toISOString(),
            featuredImage: {
              node: {
                sourceUrl: "/business-meeting-diversity.png",
              },
            },
          },
          {
            id: "mock-business-2",
            title: "New Trade Agreement to Boost Intra-African Commerce",
            excerpt:
              "The implementation of a continental free trade area is expected to significantly increase trade between African nations...",
            slug: "trade-agreement-commerce",
            date: new Date().toISOString(),
            featuredImage: {
              node: {
                sourceUrl: "/business-meeting-diversity.png",
              },
            },
          },
        ],
      },
    },
    {
      id: "mock-cat-3",
      name: "Entertainment",
      slug: "entertainment",
      posts: {
        nodes: [
          {
            id: "mock-entertainment-1",
            title: "Cultural Festival Celebrates Pan-African Unity",
            excerpt:
              "A major cultural festival bringing together artists from across the continent has begun in Nairobi...",
            slug: "cultural-festival-unity",
            date: new Date().toISOString(),
            featuredImage: {
              node: {
                sourceUrl: "/diverse-entertainment.png",
              },
            },
          },
          {
            id: "mock-entertainment-2",
            title: "African Film Industry Sees Global Recognition",
            excerpt:
              "Productions from several African countries are receiving international acclaim at major film festivals...",
            slug: "film-industry-recognition",
            date: new Date().toISOString(),
            featuredImage: {
              node: {
                sourceUrl: "/diverse-entertainment.png",
              },
            },
          },
        ],
      },
    },
    {
      id: "mock-cat-4",
      name: "Sport",
      slug: "sport",
      posts: {
        nodes: [
          {
            id: "mock-sport-1",
            title: "Sports Tournament Showcases African Talent",
            excerpt: "The continental championship has begun with record participation from countries across Africa...",
            slug: "sports-tournament-talent",
            date: new Date().toISOString(),
            featuredImage: {
              node: {
                sourceUrl: "/diverse-group-playing-various-sports.png",
              },
            },
          },
          {
            id: "mock-sport-2",
            title: "Young Athletes Breaking Records in International Competition",
            excerpt: "A new generation of African athletes is making waves on the global stage...",
            slug: "young-athletes-records",
            date: new Date().toISOString(),
            featuredImage: {
              node: {
                sourceUrl: "/diverse-group-playing-various-sports.png",
              },
            },
          },
        ],
      },
    },
    {
      id: "mock-cat-5",
      name: "Editorial",
      slug: "editorial",
      posts: {
        nodes: [
          {
            id: "mock-editorial-1",
            title: "Opinion: The Future of Democracy in Africa",
            excerpt:
              "As several nations approach elections, experts weigh in on the state of democratic institutions...",
            slug: "future-democracy-africa",
            date: new Date().toISOString(),
            featuredImage: {
              node: {
                sourceUrl: "/editorial-image.png",
              },
            },
          },
          {
            id: "mock-editorial-2",
            title: "Analysis: Economic Policies for Sustainable Growth",
            excerpt:
              "Examining the balance between development and environmental protection across African economies...",
            slug: "economic-policies-analysis",
            date: new Date().toISOString(),
            featuredImage: {
              node: {
                sourceUrl: "/editorial-image.png",
              },
            },
          },
        ],
      },
    },
    {
      id: "mock-cat-6",
      name: "Health",
      slug: "health",
      posts: {
        nodes: [
          {
            id: "mock-health-1",
            title: "Healthcare Innovations Transforming Rural Communities",
            excerpt: "New mobile health initiatives are bringing critical care to previously underserved regions...",
            slug: "healthcare-innovations-rural",
            date: new Date().toISOString(),
            featuredImage: {
              node: {
                sourceUrl: "/abstract-health.png",
              },
            },
          },
          {
            id: "mock-health-2",
            title: "Public Health Campaign Shows Promising Results",
            excerpt: "A continent-wide initiative to address preventable diseases is reporting significant progress...",
            slug: "public-health-campaign",
            date: new Date().toISOString(),
            featuredImage: {
              node: {
                sourceUrl: "/abstract-health.png",
              },
            },
          },
        ],
      },
    },
  ],
  recentPosts: [
    {
      id: "mock-recent-1",
      title: "Breaking: Major Development in African Politics",
      excerpt:
        "A significant political shift is occurring across the continent as new leadership emerges in several key nations...",
      slug: "breaking-major-development",
      date: new Date().toISOString(),
      featuredImage: {
        node: {
          sourceUrl: "/news-collage.png",
        },
      },
      categories: {
        nodes: [{ name: "News", slug: "news" }],
      },
      tags: {
        nodes: [],
      },
    },
    {
      id: "mock-recent-2",
      title: "Economic Growth Surges Across East Africa",
      excerpt: "Several East African nations are reporting unprecedented economic growth despite global challenges...",
      slug: "economic-growth-east-africa",
      date: new Date().toISOString(),
      featuredImage: {
        node: {
          sourceUrl: "/business-meeting-diversity.png",
        },
      },
      categories: {
        nodes: [{ name: "Business", slug: "business" }],
      },
      tags: {
        nodes: [],
      },
    },
  ],
}
