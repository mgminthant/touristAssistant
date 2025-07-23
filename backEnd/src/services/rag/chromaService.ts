// This file manage chromadb collection fetching or creation with retry/timeout logic

import { ChromaClient, Collection } from "chromadb";
import { config } from "../../config";

//Singleton promise to enuse only one collection is created/fetched at a time
let collectionPromises: { [key: string]: Promise<Collection> } = {};

//Chroma client instance
const client = new ChromaClient({ path: config.chromaDbUrl });

//Maximum number of retries for collection creation
const MAX_RETRIES = 3;

//Timeout for collection creation (milliseconds)
const TIMEOUT_MS = 5000;

/**
 * Simulates a delayed operation for testing timeout and retry logic.
 * @returns {Promise<Collection> A promise that resolves after 10s as a fake Collection}
 */
function fakeDelayedOperation(): Promise<Collection> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ name: "fake" } as Collection);
    }, 10000);
  });
}

/**
 * Warp a promise with timeout. If the promise doesn't resolve within the specified time,
 * return a rejected promise.
 * @template T
 * @param {Promise<T>} promise  - The promise to wrap.
 * @param {number} timeoutMs - specific time that reject promise.
 * @returns {Promise<T>} - The wrapped promise.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), timeoutMs)
    ),
  ]);
}

/**
 * Retry an asynchronous operation a specified number of times, applying a timeout to each attempt.
 * @template T
 * @param {() => Promise<T>} operation - The async operation to retry.
 * @param {number} retriesLeft - Numbers of time left to retry.
 * @returns {Promise<T> } The result of the operation if successful.
 * @throws Will throws the last error if all retries fail.
 */
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

/**
 * Gets or creates chormadb collection with retry and timeout logic.
 * Ensures that only one collection is created or fetched.
 * @param {string} collectionName - Name of the collection.
 * @returns {Promise<Collection>} - Chromadb collection instance.
 */
export function getOrCreateCollection(
  collectionName: string
): Promise<Collection> {
  // Check if a promise for this collection already exists
  if (!collectionPromises[collectionName]) {
    collectionPromises[collectionName] = (async () => {
      const collection = await retryOperation(
        () => client.getOrCreateCollection({ name: collectionName }),
        MAX_RETRIES
      );
      console.log(`Collection "${collectionName}" is ready.`);
      return collection;
    })();
  } else {
    console.log("fetch collection", collectionName);
  }
  return collectionPromises[collectionName];
}
