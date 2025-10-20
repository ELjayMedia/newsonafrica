"use client"

import MediaQueryRenderer, {
  type MediaQueryRendererProps,
} from "./MediaQueryRenderer"

export type ClientOnlyMediaQueryProps = Omit<MediaQueryRendererProps, "ssrSafe">

export default function ClientOnlyMediaQuery(props: ClientOnlyMediaQueryProps) {
  return <MediaQueryRenderer {...props} ssrSafe />
}
