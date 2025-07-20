import { Request, Response, NextFunction } from "express";
import { config } from "../config/index";
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(err);
  res.status(err.statusCode || 500).json({
    error: {
      message: err.message || "Internal Server Error",
      stack:config.mode === "production" ? undefined : err.stack,
    },
  });
}
