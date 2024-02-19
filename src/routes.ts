import { Dataset, createPlaywrightRouter } from 'crawlee';
import { readFile, writeFile } from "fs/promises";
import { PathLike } from "fs";
import { glob } from 'glob';
import { isWithinTokenLimit } from "gpt-tokenizer";
import { Page } from "playwright";
import { defaultConfig } from './constants/dataa';

export const router = createPlaywrightRouter();

// function generateUrls(baseURL: any, numberOfPages: any) {
//     const urls = [];
//     for (let i = 1; i <= numberOfPages; i++) {
//       urls.push(`${baseURL}/page${i}`);
//     }
//     return urls;
//   }
  
//   const baseURL = defaultConfig.match;
//   const numberOfPagesToCrawl = 5;
//   const urlsToCrawl = generateUrls(baseURL, numberOfPagesToCrawl);

router.addDefaultHandler(async ({ enqueueLinks, log }) => {
    log.info(`enqueueing new URLs`);
    await enqueueLinks({
        globs: [defaultConfig.match],
        // urls: urlsToCrawl,
        label: 'detail',
    });
});

router.addHandler('detail', async ({ request, page, log }) => {
    const title = await page.title();
    log.info(`${title}`, { url: request.loadedUrl });
    const html = await getPageHtml(page, "body")

    await Dataset.pushData({
        url: request.loadedUrl,
        title,
        html
    });
});

export async function write() {
    let nextFileNameString: PathLike = "";
    const jsonFiles = await glob("storage/datasets/default/*.json", {
      absolute: true,
    });
  
    console.log(`Found ${jsonFiles.length} files to combine...`);
  
    let currentResults: Record<string, any>[] = [];
    let currentSize: number = 0;
    let fileCounter: number = 1;
    const maxBytes: number = 100000000
      ? 100000000 * 1024 * 1024
      : Infinity;
  
    const getStringByteSize = (str: string): number =>
      Buffer.byteLength(str, "utf-8");
  
    const nextFileName = (): string =>
      `${"output.json".replace(/\.json$/, "")}-${fileCounter}.json`;
  
    const writeBatchToFile = async (): Promise<void> => {
      nextFileNameString = nextFileName();
      await writeFile(
        nextFileNameString,
        JSON.stringify(currentResults, null, 2),
      );
      console.log(
        `Wrote ${currentResults.length} items to ${nextFileNameString}`,
      );
      currentResults = [];
      currentSize = 0;
      fileCounter++;
    };
  
    let estimatedTokens: number = 0;
  
    const addContentOrSplit = async (
      data: Record<string, any>,
    ): Promise<void> => {
      const contentString: string = JSON.stringify(data);
      const tokenCount: number | false = isWithinTokenLimit(
        contentString,
        100000000 || Infinity,
      );
  
      if (typeof tokenCount === "number") {
        if (estimatedTokens + tokenCount > 100000000!) {
          // Only write the batch if it's not empty (something to write)
          if (currentResults.length > 0) {
            await writeBatchToFile();
          }
          // Since the addition of a single item exceeded the token limit, halve it.
          estimatedTokens = Math.floor(tokenCount / 2);
          currentResults.push(data);
        } else {
          currentResults.push(data);
          estimatedTokens += tokenCount;
        }
      }
  
      currentSize += getStringByteSize(contentString);
      if (currentSize > maxBytes) {
        await writeBatchToFile();
      }
    };
  
    // Iterate over each JSON file and process its contents.
    for (const file of jsonFiles) {
      const fileContent = await readFile(file, "utf-8");
      const data: Record<string, any> = JSON.parse(fileContent);
      await addContentOrSplit(data);
    }
  
    // Check if any remaining data needs to be written to a file.
    if (currentResults.length > 0) {
      await writeBatchToFile();
    }
  
    return nextFileNameString;
  }
  
  export function getPageHtml(page: Page, selector = "*") {
    return page.evaluate((selector) => {
      // Check if the selector is an XPath
      if (selector.startsWith("/")) {
        const elements = document.evaluate(
          selector,
          document,
          null,
          XPathResult.ANY_TYPE,
          null,
        );
        let result = elements.iterateNext();
        return result ? result.textContent || "" : "";
      } else {
        // Handle as a CSS selector
        const el = document.querySelector(selector) as HTMLElement | null;
        return el?.innerText || "";
      }
    }, selector);
  }

//   class GPTCrawlerCore {
//     config: Config;
  
//     constructor(config: Config) {
//       this.config = config;
//     }
  
//     async crawl() {
//       await crawl(this.config);
//     }
  
//     async write(): Promise<PathLike> {
//       // we need to wait for the file path as the path can change
//       return new Promise((resolve, reject) => {
//         write(this.config)
//           .then((outputFilePath) => {
//             resolve(outputFilePath);
//           })
//           .catch(reject);
//       });
//     }
//   }
