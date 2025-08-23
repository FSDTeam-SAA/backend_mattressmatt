import express from "express";

import {
  addUpdatePrivacyPolicy,
  getPrivacyPolicy,
  addUpdateTermsCondition,
  getTermsCondition,
} from "../controller/settings.controller.js";

const router = express.Router();

router.post("/privacy-policy", addUpdatePrivacyPolicy);
router.get("/privacy-policy", getPrivacyPolicy);
router.post("/terms-condition", addUpdateTermsCondition);
router.get("/terms-condition", getTermsCondition);

export default router;
