const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

const ENTITY_PATTERN = /&(#(?:x[a-fA-F0-9]+|[0-9]+)|[a-zA-Z]+);/g;

export function decodeHtmlEntities(value: string): string {
  if (!value) {
    return "";
  }

  return value.replace(ENTITY_PATTERN, (match, entity) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const codePoint = Number.parseInt(entity.slice(2), 16);
      if (Number.isFinite(codePoint)) {
        return String.fromCodePoint(codePoint);
      }
      return match;
    }

    if (entity.startsWith("#")) {
      const codePoint = Number.parseInt(entity.slice(1), 10);
      if (Number.isFinite(codePoint)) {
        return String.fromCodePoint(codePoint);
      }
      return match;
    }

    const mapped = NAMED_ENTITIES[entity];
    return typeof mapped === "string" ? mapped : match;
  });
}
