import { fetchPinterestTrends } from "./pinterest.js";

const pinterestChinese = {
  name: "pinterest-chinese" as const,

  async fetch(opts: { geo: string }) {
    return fetchPinterestTrends({
      geo: opts.geo,
      source: "pinterest-chinese",
      keywordToInclude: "chinese",
    });
  },
};

export default pinterestChinese;

