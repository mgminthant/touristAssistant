import { Request, Response, NextFunction } from "express";
import { InferenceClient } from "@huggingface/inference";
import { config } from "../config";
import {
  ValidationError,
  addData,
  extractTextFromTextFile,
  queryResponse,
} from "../services/rag/ragService";
import multer from "multer";
export const hf = new InferenceClient(config.hfApiToken);

export async function addDataSentence(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { sentence } = req.body;

  try {
    const message = await addData(sentence);
    return res.status(message.status).json({ message: message });
  } catch (error) {
    next(error);
  }
}

export async function addDataWithFile(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.file) {
      throw new ValidationError(
        "File not found. Please provide a valid file path."
      );
    }
    extractTextFromTextFile(req.file?.filename);
  } catch (error) {
    next(error);
  }
}
export async function getResponse(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { query, n_results = 3 } = req.body;

    const { status, response } = await queryResponse(query, n_results);

    res.status(status).json({
      query,
      response,
    });
  } catch (error) {
    next(error);
  }
}
