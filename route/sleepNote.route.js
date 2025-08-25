import express from "express"
import { createSleepNote, deleteSleepNote, getSleepNoteById, getSleepNotes, updateSleepNote } from "../controller/sleepNote.controller.js";

const router = express.Router();

router.post("/", createSleepNote);
router.get("/", getSleepNotes);
router.get("/:id", getSleepNoteById);
router.put("/:id", updateSleepNote);
router.delete("/:id", deleteSleepNote);

export default router
