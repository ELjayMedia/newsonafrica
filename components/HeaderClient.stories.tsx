import type { Meta, StoryObj } from "@storybook/react"

import { HeaderClient, type HeaderCategory } from "@/components/HeaderClient"

const categories: HeaderCategory[] = [
  { id: 1, name: "Business", slug: "business" },
  { id: 2, name: "Culture", slug: "culture" },
  { id: 3, name: "News", slug: "news" },
  { id: 4, name: "Sport", slug: "sport" },
]

const meta: Meta<typeof HeaderClient> = {
  title: "Components/Header",
  component: HeaderClient,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    countryCode: "sz",
  },
}

export default meta

type Story = StoryObj<typeof HeaderClient>

export const GuestUser: Story = {
  args: {
    categories: [...categories].sort((a, b) => a.name.localeCompare(b.name)),
  },
}

export const AuthenticatedUser: Story = {
  args: {
    categories: [
      categories[3],
      categories[2],
      categories[0],
      categories[1],
    ],
  },
  parameters: {
    docs: {
      description: {
        story: "Shows user-preferred sections first to mirror authenticated ordering without client refetching.",
      },
    },
  },
}
