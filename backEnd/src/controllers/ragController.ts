import { Request, Response, NextFunction } from "express";
import { InferenceClient } from "@huggingface/inference";

import { config } from "../config";
import {
  addData,
  queryResponse,
} from "../services/rag/ragService";

export const hf = new InferenceClient(config.hfApiToken);

export async function addSentence(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { sentence } = req.body;
  try {
    const message = await addData(sentence);
    return res.status(message.status).json({ message: message.message });
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
