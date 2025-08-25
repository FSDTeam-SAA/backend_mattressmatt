import express from "express";

import {
  addUpdatePrivacyPolicy,
  getPrivacyPolicy,
  addUpdateTermsCondition,
  getTermsCondition,
} from "../controller/settings.controller.js";

const router = express.Router();

router.patch("/privacy-policy", addUpdatePrivacyPolicy);
router.get("/privacy-policy", getPrivacyPolicy);
router.patch("/terms-condition", addUpdateTermsCondition);
router.get("/terms-condition", getTermsCondition);

export default router;
