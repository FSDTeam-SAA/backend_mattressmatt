import Stripe from 'stripe'
import { User } from '../model/user.model.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15',
})

export const stripeWebhookHandler = async (req, res) => {
  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed.', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // ✅ Handle account.updated
  if (event.type === 'account.updated') {
    const account = event.data.object

    if (account.charges_enabled && account.details_submitted) {
      // Find user by stripeAccountId
      const user = await User.findOne({ stripeAccountId: account.id })
      if (user && !user.isStripeOnboarded) {
        user.isStripeOnboarded = true
        await user.save()
        console.log(`✅ Seller ${user._id} onboarding completed`)
      }
    }
  }

  res.json({ received: true })
}
