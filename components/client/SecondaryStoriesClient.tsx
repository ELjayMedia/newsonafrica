"use client"

import {
  SecondaryStoriesContent,
  type SecondaryStoriesProps,
} from "../secondary-stories/SecondaryStoriesContent"

export function SecondaryStoriesClient(props: SecondaryStoriesProps) {
  return <SecondaryStoriesContent {...props} />
}
