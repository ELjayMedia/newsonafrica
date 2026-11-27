import { cn } from "@/lib/utils";

/**
 * Small wireframe of a News On Africa page with one ad placement highlighted,
 * for the advertise page's "Where your ad appears" section. Pure markup (no
 * images): grey page skeleton, green ad. Positions are percentages of the
 * frame so the sketch scales with its card.
 */
export type MockDevice = "desktop" | "mobile";

export type MockSpot =
  | "billboard"
  | "leaderboard"
  | "rail-mpu"
  | "half-page"
  | "in-article"
  | "in-feed"
  | "takeover"
  | "m-top-banner"
  | "m-in-feed"
  | "m-in-article"
  | "m-sticky";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Where each placement's ad sits in the frame (percent). */
const AD: Record<MockSpot, Rect[]> = {
  billboard: [{ top: 17, left: 10, width: 80, height: 17 }],
  leaderboard: [{ top: 3, left: 22, width: 56, height: 7 }],
  "rail-mpu": [{ top: 40, left: 66, width: 24, height: 21 }],
  "half-page": [{ top: 40, left: 66, width: 24, height: 52 }],
  "in-article": [{ top: 56, left: 25, width: 24, height: 21 }],
  "in-feed": [{ top: 49, left: 21, width: 30, height: 21 }],
  takeover: [
    { top: 0, left: 0, width: 9, height: 100 },
    { top: 0, left: 91, width: 9, height: 100 },
    { top: 17, left: 10, width: 80, height: 17 },
  ],
  "m-top-banner": [{ top: 17, left: 8, width: 84, height: 6 }],
  "m-in-feed": [{ top: 52, left: 8, width: 84, height: 21 }],
  "m-in-article": [{ top: 46, left: 8, width: 84, height: 21 }],
  "m-sticky": [{ top: 80, left: 8, width: 84, height: 6 }],
};

/** Grey skeleton blocks: headline bars, text lines, story rows, rail. */
function Bar({ r, className }: { r: Rect; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("absolute rounded-[2px] bg-noa-hairline", className)}
      style={{ top: `${r.top}%`, left: `${r.left}%`, width: `${r.width}%`, height: `${r.height}%` }}
    />
  );
}

function DesktopSkeleton({ spot }: { spot: MockSpot }) {
  const article = spot === "in-article";
  const body = spot === "billboard" || spot === "takeover" ? 38 : 16;
  const lines: Rect[] = [];
  if (article) {
    lines.push({ top: 16, left: 10, width: 46, height: 5 });
    for (let i = 0; i < 4; i++)
      lines.push({ top: 25 + i * 6, left: 10, width: i === 3 ? 30 : 50, height: 2.5 });
    for (let i = 0; i < 3; i++)
      lines.push({ top: 81 + i * 6, left: 10, width: i === 2 ? 34 : 50, height: 2.5 });
  } else {
    // Lead story (image + headline), then rows of stories.
    lines.push(
      { top: body, left: 10, width: 24, height: 18 },
      { top: body + 1, left: 36, width: 22, height: 4 },
    );
    lines.push(
      { top: body + 7, left: 36, width: 18, height: 2.5 },
      { top: body + 11, left: 36, width: 20, height: 2.5 },
    );
    const rowStart = body + 24;
    for (let i = 0; i < 4; i++) {
      const top = rowStart + i * 9 + (spot === "in-feed" && i >= 1 ? 24 : 0);
      if (top > 92) break;
      lines.push(
        { top, left: 10, width: 8, height: 6 },
        { top: top + 1, left: 20, width: 34, height: 2.5 },
      );
    }
  }
  // Right rail panels (hidden where the ad itself is the rail unit).
  const rail: Rect[] =
    spot === "rail-mpu"
      ? [{ top: 64, left: 66, width: 24, height: 28 }]
      : spot === "half-page"
        ? []
        : [
            { top: body, left: 66, width: 24, height: 30 },
            { top: body + 33, left: 66, width: 24, height: 22 },
          ];

  return (
    <>
      {/* Masthead + nav */}
      <Bar
        r={{ top: spot === "leaderboard" ? 12 : 3, left: 10, width: 12, height: 4 }}
        className="bg-noa-green/70"
      />
      <Bar r={{ top: spot === "leaderboard" ? 13 : 4, left: 70, width: 20, height: 2.5 }} />
      {lines.map((r, i) => (
        <Bar key={i} r={r} />
      ))}
      {rail.map((r, i) => (
        <Bar key={`r${i}`} r={r} className="bg-noa-hairline/70" />
      ))}
    </>
  );
}

function MobileSkeleton({ spot }: { spot: MockSpot }) {
  const article = spot === "m-in-article";
  const lines: Rect[] = [{ top: 7, left: 8, width: 30, height: 4 }];
  if (article) {
    lines.push(
      { top: 15, left: 8, width: 80, height: 4 },
      { top: 20, left: 8, width: 60, height: 4 },
    );
    for (let i = 0; i < 4; i++)
      lines.push({ top: 28 + i * 4, left: 8, width: i === 3 ? 50 : 84, height: 2 });
    for (let i = 0; i < 4; i++)
      lines.push({ top: 71 + i * 4, left: 8, width: i === 3 ? 44 : 84, height: 2 });
  } else {
    const start = spot === "m-top-banner" ? 26 : 16;
    lines.push(
      { top: start, left: 8, width: 84, height: 18 },
      { top: start + 20, left: 8, width: 70, height: 3 },
    );
    const rowStart = start + 27;
    for (let i = 0; i < 5; i++) {
      const top =
        rowStart + i * 8 + (spot === "m-in-feed" && i >= 0 && rowStart + i * 8 >= 50 ? 24 : 0);
      if (top > 84) break;
      lines.push(
        { top, left: 8, width: 18, height: 6 },
        { top: top + 1, left: 30, width: 56, height: 2 },
      );
    }
  }
  return (
    <>
      {lines.map((r, i) => (
        <Bar key={i} r={r} className={i === 0 ? "bg-noa-green/70" : undefined} />
      ))}
      {/* Tab bar */}
      {!article ? (
        <Bar
          r={{ top: 90, left: 0, width: 100, height: 10 }}
          className="rounded-none bg-noa-hairline/80"
        />
      ) : null}
    </>
  );
}

export function PlacementMockup({
  device,
  spot,
  className,
}: {
  device: MockDevice;
  spot: MockSpot;
  className?: string;
}) {
  const isDesktop = device === "desktop";
  return (
    <div
      aria-hidden
      className={cn(
        "relative mx-auto overflow-hidden border border-border bg-noa-white shadow-sm",
        isDesktop ? "aspect-[16/10] w-full rounded-md" : "aspect-[9/16] w-[46%] rounded-[14px]",
        className,
      )}
    >
      {isDesktop ? (
        // Browser chrome
        <span className="absolute inset-x-0 top-0 z-10 flex h-[6%] items-center gap-[1.5%] bg-noa-paper px-[2%]">
          {[0, 1, 2].map((i) => (
            <span key={i} className="aspect-square h-[45%] rounded-full bg-noa-hairline" />
          ))}
        </span>
      ) : null}
      <div className={cn("absolute inset-x-0 bottom-0", isDesktop ? "top-[6%]" : "top-0")}>
        {isDesktop ? <DesktopSkeleton spot={spot} /> : <MobileSkeleton spot={spot} />}
        {AD[spot].map((r, i) => (
          <span
            key={`ad${i}`}
            className="noa-mock-ad absolute flex items-center justify-center rounded-[3px] font-display text-[0.5rem] font-black tracking-[0.12em] text-white"
            style={{
              top: `${r.top}%`,
              left: `${r.left}%`,
              width: `${r.width}%`,
              height: `${r.height}%`,
            }}
          >
            {r.width > 14 && r.height > 5 ? "AD" : null}
          </span>
        ))}
      </div>
    </div>
  );
}
