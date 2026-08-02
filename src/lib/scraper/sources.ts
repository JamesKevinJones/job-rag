/** Optional HTML listing pages scraped with Cheerio in addition to APIs. */
export const HTML_LISTING_SOURCES = [
  {
    id: "wwr-programming",
    url: "https://weworkremotely.com/categories/remote-programming-jobs",
    kind: "wwr-list" as const,
  },
];

export const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
export const REQUEST_DELAY_MS = 400;
