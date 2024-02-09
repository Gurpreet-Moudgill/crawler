import { Dataset, createPlaywrightRouter } from 'crawlee';
import { readFile, writeFile } from "fs/promises";
import { PathLike } from "fs";
import { glob } from 'glob';
import { isWithinTokenLimit } from "gpt-tokenizer";

export const router = createPlaywrightRouter();

router.addDefaultHandler(async ({ enqueueLinks, log }) => {
    log.info(`enqueueing new URLs`);
    await enqueueLinks({
        globs: ['https://crawlee.dev/**'],
        label: 'detail',
    });
});

router.addHandler('detail', async ({ request, page, log }) => {
    const title = await page.title();
    log.info(`${title}`, { url: request.loadedUrl });

    await Dataset.pushData({
        url: request.loadedUrl,
        title,
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
    const maxBytes: number = 5000
      ? 5000 * 1024 * 1024
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
        5000 || Infinity,
      );
  
      if (typeof tokenCount === "number") {
        if (estimatedTokens + tokenCount > 5000!) {
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
