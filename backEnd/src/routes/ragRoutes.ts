import { Router } from "express";
import { addSentence, getResponse } from "../controllers/ragController";

const router = Router();

//add data to chromadb
router.post("/newSentence", addSentence);
//get response
router.post("/response", getResponse);

export default router;
