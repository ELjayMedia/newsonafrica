"use client"

import { InteractiveLink } from "./InteractiveLink"

export function SomeServerComponent() {
  return (
    <div>
      <InteractiveLink href="/some-path" className="some-class" onClick={() => console.log("Clicked!")}>
        Click me
      </InteractiveLink>
    </div>
  )
}
