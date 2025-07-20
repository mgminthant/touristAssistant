import { Router } from "express";
import { addSentence, getResponse } from "../controllers/ragController";

const router = Router();

router.post("/newSentence", addSentence);
router.post("/response", getResponse);
export default router;
