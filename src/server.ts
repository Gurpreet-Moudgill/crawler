import express, { Express } from "express";
import cors from "cors"
import { CheerioCrawler, Dataset, PlaywrightCrawler, purgeDefaultStorages } from 'crawlee';
// import { PlaywrightCrawler, ProxyConfiguration } from "crawlee";
import { getPageHtml, router, write } from "./routes.js";
import { defaultConfig } from "./constants/dataa.js";
import { Page } from "playwright";

const app: Express = express();
const port = 5000;

app.use(cors());
app.use(express.json());
// app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// export const defaultConfig = {
//     url: "https://blocktechbrew.com/",
//     match: "https://blocktechbrew.com/about-us/**",
//     // maxPagesToCrawl: 50,
//     // outputFileName: "output.json",
//     // maxTokens: 2000000,
//   };

app.post("/crawl", async (req, res) => {
    try{
      const data = req.body
      const startUrls = [defaultConfig.url];
      console.log([data.url], startUrls);
      

      const crawler = new PlaywrightCrawler({
        async requestHandler({ request, page, enqueueLinks, log }) {
          const title = await page.title();
          log.info(`Title of ${request.loadedUrl} is '${title}'`);
          const html = await getPageHtml(page, "body")
          await Dataset.pushData({ title, url: request.loadedUrl, html });
          await enqueueLinks();
      },
      maxRequestsPerCrawl: 0,
      });
    await crawler.run([data.url]);
    
    await write()
    // await purgeDefaultStorages();
    res.send("done")
}
    catch (error) {
        return res
          .status(500)
          .json({ message: "Error occurred during crawling", error: error });
      }
})

app.listen(port, () => {
    console.log(`API server listening at port ${port}`);
  });

export default app;