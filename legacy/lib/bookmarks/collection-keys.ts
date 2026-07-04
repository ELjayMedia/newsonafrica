export const UNASSIGNED_COLLECTION_KEY = "__unassigned__"

export function collectionKeyForId(collectionId: string | null | undefined): string {
  if (!collectionId) {
    return UNASSIGNED_COLLECTION_KEY
  }
  return collectionId
}
