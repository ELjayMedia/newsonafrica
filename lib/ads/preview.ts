/**
 * Commercial preview: when NEXT_PUBLIC_AD_PREVIEW=1 at build time, ad slots
 * render their labelled IAB placeholder frames so layouts and inventory can
 * be reviewed (sales decks, design proposals). Unset in production, where
 * unfilled slots collapse and render nothing (NOA-180).
 */
export const AD_PREVIEW = process.env.NEXT_PUBLIC_AD_PREVIEW === "1";
