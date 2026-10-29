import { describe, expect, it } from "vitest";

import { decodeHtmlEntities, stripHtml } from "@/lib/wordpress/html";

describe("decodeHtmlEntities", () => {
  it("decodes the typographic entities WordPress emits", () => {
    expect(
      decodeHtmlEntities("Wait&hellip; &ldquo;Yes&rdquo; &ndash; it&rsquo;s &mdash; done"),
    ).toBe("Wait… “Yes” – it’s — done");
  });

  it("decodes numeric entities and leaves unknown names untouched", () => {
    expect(decodeHtmlEntities("&#8230; &#x2019; &bogus;")).toBe("… ’ &bogus;");
  });
});

describe("stripHtml", () => {
  it("turns a WordPress auto-excerpt into plain text", () => {
    expect(stripHtml("<p>Inspired by the siSwati phrase, it runs from 1 to [&hellip;]</p>\n")).toBe(
      "Inspired by the siSwati phrase, it runs from 1 to […]",
    );
  });
});
