// For more information, see https://crawlee.dev/
import { PlaywrightCrawler, ProxyConfiguration } from "crawlee";
import { router, write } from "./routes.js";

const startUrls = ["https://blocktechbrew.com/"];

const crawler = new PlaywrightCrawler({
  // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
  requestHandler: router,
  // Uncomment and change to false to open the browser
  // headless: false,
});

await crawler.run(startUrls);
await write()
