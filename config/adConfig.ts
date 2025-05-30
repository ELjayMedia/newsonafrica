export const AD_CONFIG = {
  gam: {
    networkCode: "148708980", // Replace with your GAM network code
    adUnits: {
      // Desktop Ad Units
      desktopTopBanner: "/148708980/newsonafrica/desktop/top-banner",
      desktopBelowHeader: "/148708980/newsonafrica/desktop/below-header",
      desktopSidebar: "/148708980/newsonafrica/desktop/sidebar",
      desktopSidebarRectangle: "/148708980/newsonafrica/desktop/sidebar-rectangle",
      desktopCategory: "/148708980/newsonafrica/desktop/category",
      desktopHeaderTop: "/148708980/newsonafrica/desktop/header-top",
      desktopHomeAfterHero: "/148708980/newsonafrica/desktop/home-after-hero",
      desktopHomeMidContent: "/148708980/newsonafrica/desktop/home-mid-content",
      desktopInArticle1: "/148708980/newsonafrica/desktop/in-article-1",
      desktopInArticle2: "/148708980/newsonafrica/desktop/in-article-2",
      desktopFooterBanner: "/148708980/newsonafrica/desktop/footer-banner",

      // Mobile Ad Units
      mobileTopBanner: "/148708980/newsonafrica/mobile/top-banner",
      mobileBelowHeader: "/148708980/newsonafrica/mobile/below-header",
      mobileHomeAfterHero: "/148708980/newsonafrica/mobile/home-after-hero",
      mobileHomeMidContent: "/148708980/newsonafrica/mobile/home-mid-content",
      mobileInArticle1: "/148708980/newsonafrica/mobile/in-article-1",
      mobileInArticle2: "/148708980/newsonafrica/mobile/in-article-2",
      mobileFooterBanner: "/148708980/newsonafrica/mobile/footer-banner",
    },
    sizes: {
      leaderboard: [728, 90],
      banner: [320, 50],
      rectangle: [300, 250],
      largeRectangle: [336, 280],
      skyscraper: [160, 600],
      wideSkyscraper: [300, 600],
      mobileBanner: [320, 50],
      mobileLargeBanner: [320, 100],
    },
    responsiveSizes: {
      topBanner: [
        [728, 90],
        [320, 50],
      ],
      sidebar: [
        [300, 250],
        [300, 600],
      ],
      inArticle: [
        [728, 90],
        [320, 50],
        [300, 250],
      ],
    },
  },
}
