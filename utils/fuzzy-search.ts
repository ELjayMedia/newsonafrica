import Fuse from "fuse.js"

export function fuzzySearch<T>(items: T[], query: string, options: Fuse.IFuseOptions<T>): T[] {
  const fuse = new Fuse(items, options)
  return fuse.search(query).map((result) => result.item)
}
