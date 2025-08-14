export const AD_UNIT_ROOT = '/1234567/newsonafrica';

export const SLOTS = {
  leaderboard: `${AD_UNIT_ROOT}/leaderboard`,
  infeed: `${AD_UNIT_ROOT}/infeed`,
  rectangle: `${AD_UNIT_ROOT}/rectangle`,
  sidebar: `${AD_UNIT_ROOT}/sidebar`,
  inarticle: `${AD_UNIT_ROOT}/inarticle`,
};

export function makeSizeMapping(googletag: googletag.Googletag): googletag.SizeMappingArray {
  return googletag
    .sizeMapping()
    .addSize(
      [0, 0],
      [
        [320, 50],
        [320, 100],
        [300, 250],
      ],
    )
    .addSize(
      [480, 0],
      [
        [468, 60],
        [300, 250],
      ],
    )
    .addSize(
      [768, 0],
      [
        [728, 90],
        [300, 250],
      ],
    )
    .addSize(
      [1024, 0],
      [
        [970, 250],
        [728, 90],
        [300, 250],
        [300, 600],
      ],
    )
    .build();
}
