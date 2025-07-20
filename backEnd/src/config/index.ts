import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  hfApiToken: process.env.HUGGING_FACE_API_TOKEN || "",
  chromaDbUrl: process.env.CHROMA_DB_URL || "",
  embeddingModel: "sentence-transformers/all-MiniLM-L6-v2",
  completionModel: "meta-llama/Llama-3.3-70B-Instruct",
  mode: process.env.NODE_ENV || "development",
};
