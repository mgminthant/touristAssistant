import { Router } from "express";
import {
  addDataSentence,
  addDataWithFile,
  getResponse,
} from "../controllers/ragController";
import { upload } from "../middlewares/fileUploader";

const router = Router();
//add data to chromadb with sentence
router.post("/newDataWithSentence", addDataSentence);

//add data to charomadb with file
router.post("/newDataWithFile", upload.single("file"), addDataWithFile);

//get response
router.post("/response", getResponse);

export default router;
