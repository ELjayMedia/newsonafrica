import type React from "react"
// For modules without type definitions
declare module "*.svg" {
  const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>
  export default content
}

declare module "*.png" {
  const content: string
  export default content
}

declare module "*.jpg" {
  const content: string
  export default content
}

declare module "*.jpeg" {
  const content: string
  export default content
}

declare module "*.gif" {
  const content: string
  export default content
}

// For CSV imports
declare module "*.csv" {
  const content: string
  export default content
}

// For JSON imports with named exports
declare module "*.json" {
  const value: any
  export default value
}
