import express from "express";
import { ChromaClient } from "chromadb";
import { HfInference } from "@huggingface/inference";
import { v4 as uuidv4 } from "uuid";
import "dotenv/config";

const app = express();
const port = 3000;
app.use(express.json());

// Hugging Face Inference API client
const hf = new HfInference(process.env.HUGGING_FACE_API_TOKEN);
const embeddingModel = "sentence-transformers/all-MiniLM-L6-v2";

// ChromaDB client
const chromaDbUrl = process.env.CHROMA_DB_URL || "http://localhost:8000";
const client = new ChromaClient({ path: chromaDbUrl });
const collectionName = "my_sentence_collection";
let collectionPromise = null;

// --- Helper: Get or Create Collection (Promise-based for concurrency) ---
function getOrCreateCollection() {
  if (!collectionPromise) {
    collectionPromise = client
      .getOrCreateCollection({ name: collectionName })
      .then((col) => {
        console.log(`Collection "${collectionName}" is ready.`);
        return col;
      })
      .catch((error) => {
        console.error("Error getting or creating collection:", error);
        collectionPromise = null;
        throw error;
      });
  }
  return collectionPromise;
}

// --- API Endpoints ---

// Add a new sentence
app.post("/add", async (req, res) => {
  const { sentence } = req.body;
  if (typeof sentence !== "string" || !sentence.trim()) {
    return res.status(400).json({ error: "Sentence is required." });
  }

  try {
    // Generate embedding
    const embedding = await hf.featureExtraction({
      model: embeddingModel,
      inputs: sentence,
    });
    const flatEmbedding = Array.isArray(embedding[0])
      ? embedding[0]
      : embedding;

    // Get or create collection
    const targetCollection = await getOrCreateCollection();

    // Add to collection
    await targetCollection.add({
      ids: [uuidv4()],
      embeddings: [flatEmbedding],
      documents: [sentence],
    });

    res.status(201).json({ message: "Sentence added successfully." });
  } catch (error) {
    console.error("Error in /add endpoint:", error);
    res
      .status(500)
      .json({ error: "Failed to add sentence.", details: error.message });
  }
});

// Search for similar sentences
app.post("/search", async (req, res) => {
  const { query, n_results = 3 } = req.body;
  if (typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "Query is required." });
  }
  const nResults = parseInt(n_results, 10);
  if (isNaN(nResults) || nResults <= 0) {
    return res
      .status(400)
      .json({ error: "n_results must be a positive integer." });
  }

  try {
    // Generate embedding for query
    const queryEmbedding = await hf.featureExtraction({
      model: embeddingModel,
      inputs: query,
    });
    const flatQueryEmbedding = Array.isArray(queryEmbedding[0])
      ? queryEmbedding[0]
      : queryEmbedding;

    // Get collection
    const targetCollection = await getOrCreateCollection();

    // Query collection
    const results = await targetCollection.query({
      queryEmbeddings: [flatQueryEmbedding],
      nResults,
    });

    res.status(200).json({
      matches: results.documents[0] || [],
      ids: results.ids[0] || [],
      distances: results.distances[0] || [],
    });
  } catch (error) {
    console.error("Error in /search endpoint:", error);
    res
      .status(500)
      .json({ error: "Failed to perform search.", details: error.message });
  }
});

// --- Start the Server ---

app.listen(port, async () => {
  try {
    await getOrCreateCollection();
    console.log(`Server is running on http://localhost:${port}`);
  } catch (error) {
    console.error(
      "Failed to initialize ChromaDB collection on startup:",
      error
    );
    process.exit(1);
  }
});
