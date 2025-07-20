import { InferenceClient } from "@huggingface/inference";
import { v4 as uuidv4 } from "uuid";
import { config } from "../../config";
import { getOrCreateCollection } from "./chromaService";

export const hf = new InferenceClient(config.hfApiToken);

export async function queryResponse(query: string, n_results: string) {
  if (typeof query !== "string" || !query.trim()) {
    throw new ValidationError("Sentence must be a string");
  }
  const nResults = parseInt(n_results, 10);

  if (isNaN(nResults) || nResults <= 0) {
    throw new ValidationError("Expected Reuslt must be a positive integer.");
  }

  try {
    const queryEmbedding = await generateEmbedding(query.trim());

    const targetCollection = await getOrCreateCollection("test_collection");

    const results = await targetCollection.query({
      queryEmbeddings: [queryEmbedding as number[]],
      nResults,
    });

    const context = (results?.documents || []).join("\n");

    const chatCompletion = await hf.chatCompletion({
      provider: "novita",
      model: config.completionModel,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: `Context:\n${context}\n\nQuestion: ${query}` },
      ],
      max_tokens: 256,
    });

    return { status: 200, response: chatCompletion.choices[0].message.content };
  } catch (error) {
    console.error("Error in queryResponse service:", error);
    throw new ServiceError("Failed to generate response.", error);
  }
}

export async function addData(sentence: string) {
  // Query(input) Validation
  if (typeof sentence !== "string") {
    throw new ValidationError("Sentence must be a string");
  }

  if (!sentence.trim()) {
    throw new ValidationError("Sentence cannot be empty");
  }
  if (sentence.trim().length > 1000) {
    throw new ValidationError("Sentence is too long (max 1000 characters)");
  }

  try {
    //Generate embedding
    const embedding = await generateEmbedding(sentence.trim());

    //Get or Create Collection
    const targetCollection = await getOrCreateCollection("test_collection");

    // Generate unique ID
    const id = uuidv4();

    // Add to collection
    await targetCollection.add({
      ids: [id],
      embeddings: [embedding],
      documents: [sentence.trim()],
    });

    return { status: 200, message: "Sentence added successfully." };
  } catch (error) {
    console.error("Error in addData service:", error);
    throw new ServiceError("Failed to add sentence.", error);
  }
}

// Helper function: Generate embedding
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const embedding = await hf.featureExtraction({
      model: config.embeddingModel,
      inputs: text,
    });
    // Normalize embedding format if input sentence allow string array
    // const flatEmbedding = normalizeEmbedding(embedding);

    if (!embedding || embedding.length === 0) {
      throw new Error("Invalid embedding generated");
    }
    return embedding as number[];
  } catch (error) {
    throw new Error(
      `Failed to generate embedding: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Huggingface embedding api can response differently base on input sentence
// Helper function: Normalize embedding format
// function normalizeEmbedding(embedding: any): number[] {
//   // Handle nested array: [[0.1, 0.2, 0.3]]
//   if (Array.isArray(embedding) && Array.isArray(embedding[0])) {
//     if (embedding.length === 1) {
//       return embedding[0] as number[];
//     } else {
//       // Multiple embeddings - take first one and warn
//       console.warn(
//         `Multiple embeddings detected (${embedding.length}), using the first one`
//       );
//       return embedding[0] as number[];
//     }
//   }
//   throw new Error(`Unsupported embedding format: ${typeof embedding}`);
// }

// Custom error classes
export class ValidationError extends Error {
  statusCode: number;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class ServiceError extends Error {
  statusCode: number;
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = 500;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
