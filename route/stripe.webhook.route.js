import express from 'express'
import { stripeWebhookHandler } from '../controller/stripe.webhook.controller.js';

const router = express.Router()
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler 
)

export default router
