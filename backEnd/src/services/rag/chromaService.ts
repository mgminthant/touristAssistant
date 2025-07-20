import { ChromaClient, Collection } from "chromadb";
import { config } from "../../config";
let collectionPromise: Promise<Collection> | null = null;

//Create Or Get Collection with Retry and Timeout Functionality
const client = new ChromaClient({ path: config.chromaDbUrl });
const MAX_RETRIES = 3;
const TIMEOUT_MS = 5000;

function fakeDelayedOperation(): Promise<Collection> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ name: "fake" } as Collection);
    }, 10000);
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), timeoutMs)
    ),
  ]);
}

async function retryOperation<T>(
  operation: () => Promise<T>,
  retriesLeft: number
): Promise<T> {
  try {
    return await withTimeout(operation(), TIMEOUT_MS);
  } catch (error) {
    if (retriesLeft > 0) {
      console.error(`Operation failed with error: ${error}. Retrying...`);
      return await retryOperation(operation, retriesLeft - 1);
    } else {
      throw error;
    }
  }
}

export function getOrCreateCollection(collectionName:string): Promise<Collection> {
  if (!collectionPromise) {
    collectionPromise = (async () => {
      const collection = await retryOperation(
        () => client.getOrCreateCollection({name:collectionName}),
        MAX_RETRIES
      );
      console.log(`Collection "${collectionName}" is ready.`);
      return collection;
    })();
  }
  return collectionPromise;
}
