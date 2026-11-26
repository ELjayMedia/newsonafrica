import { describe, expect, it } from "vitest";

import {
  explicitSkin,
  firstImageSrc,
  inlineBackground,
  isSampleableImage,
  safeSkinValue,
  skinSourceFor,
  toHex,
} from "@/lib/ads/skin";

describe("takeover skin", () => {
  it("accepts colours, gradients and https images only", () => {
    expect(safeSkinValue("#0b5e2d")).toBe("#0b5e2d");
    expect(safeSkinValue("rgb(12, 20, 16)")).toBe("rgb(12, 20, 16)");
    expect(safeSkinValue("linear-gradient(135deg,#0b5e2d,#15994a)")).toBe(
      "linear-gradient(135deg,#0b5e2d,#15994a)",
    );
    expect(
      safeSkinValue("url(https://ads.eljaymedia.com/images/skin.jpg) center / cover"),
    ).toBeTruthy();
    expect(safeSkinValue("url(http://evil.example/x.png)")).toBeNull();
    expect(safeSkinValue("red; position:fixed")).toBeNull();
    expect(safeSkinValue("expression(alert(1))")).toBeNull();
  });

  it("prefers an explicit data-noa-skin", () => {
    const html =
      '<div data-noa-skin="#c8102e" style="background:#000"><img src="https://ads.eljaymedia.com/images/a.png"></div>';
    expect(explicitSkin(html)).toBe("#c8102e");
    expect(skinSourceFor(html)).toEqual({ kind: "value", value: "#c8102e" });
  });

  it("samples image creatives and falls back to an HTML creative's background", () => {
    const img = '<a href="x"><img src="https://ads.eljaymedia.com/images/a.png" width="160"></a>';
    expect(firstImageSrc(img)).toBe("https://ads.eljaymedia.com/images/a.png");
    expect(skinSourceFor(img)).toEqual({
      kind: "image",
      src: "https://ads.eljaymedia.com/images/a.png",
    });
    const htmlAd =
      '<a href="{clickurl}" style="display:flex;background:linear-gradient(135deg,#0b5e2d,#15994a);color:#fff">Ad</a>';
    expect(inlineBackground(htmlAd)).toBe("linear-gradient(135deg,#0b5e2d,#15994a)");
    expect(skinSourceFor("<span>plain</span>")).toEqual({ kind: "default" });
  });

  it("only samples images hosted on the ad server", () => {
    expect(
      isSampleableImage("https://ads.eljaymedia.com/images/a.png", "https://ads.eljaymedia.com"),
    ).toBe(true);
    expect(isSampleableImage("https://example.com/a.png", "https://ads.eljaymedia.com")).toBe(
      false,
    );
    expect(isSampleableImage("http://ads.eljaymedia.com/a.png", "https://ads.eljaymedia.com")).toBe(
      false,
    );
  });

  it("formats sampled colours as hex", () => {
    expect(toHex(11, 94, 45)).toBe("#0b5e2d");
    expect(toHex(300, -2, 15.6)).toBe("#ff0010");
  });
});
