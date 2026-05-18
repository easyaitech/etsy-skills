import { fetchPinterestTrends } from "./pinterest.js";

const pinterestTrends = {
  name: "pinterest-trends" as const,

  async fetch(opts: { geo: string }) {
    return fetchPinterestTrends({
      geo: opts.geo,
      source: "pinterest-trends",
    });
  },
};

export default pinterestTrends;

