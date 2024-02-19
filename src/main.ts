// For more information, see https://crawlee.dev/
import { PlaywrightCrawler, ProxyConfiguration } from "crawlee";
import { router, write } from "./routes.js";
import { defaultConfig } from "./constants/dataa.js";

const startUrls = [defaultConfig.url];

const crawler = new PlaywrightCrawler({
  requestHandler: router,
});

await crawler.run(startUrls);
await write()
