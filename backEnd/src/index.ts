import express from "express";
import ragRoutes from "./routes/ragRoutes";
import { errorHandler } from "./middlewares/errorHandler";
import { config } from "./config";
import { getOrCreateCollection } from "./services/rag/chromaService";

const app = express();
app.use(express.json());

app.use("/api", ragRoutes);
app.use(errorHandler);

app.listen(config.port, async () => {
  try {
    await getOrCreateCollection("test_collection");
    console.log(`Server is running on http://localhost:${config.port}`);
  } catch (error) {
    console.error("Failed to initialize ChromaDB collection on startup:", error);
    process.exit(1);
  }
});
