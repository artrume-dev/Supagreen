import Stripe from "stripe";
import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Stripe client — lazy-initialised so the server starts even without the key
// set during local dev when billing isn't being tested.
// ---------------------------------------------------------------------------
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
  }
  return _stripe;
}

// Base URL used for Stripe redirect URLs (Stripe requires HTTPS)
function getPublicOrigin(): string {
  return (process.env.PUBLIC_OAUTH_ORIGIN ?? "https://supagreen-production.up.railway.app").replace(/\/+$/, "");
}

// Amount constants in pence (GBP)
const FULL_PRICE_PENCE = 2000; // £20
const SPLIT_PRICE_PENCE = 1000; // £10 (first instalment)

// ---------------------------------------------------------------------------
// GET /billing/status
// ---------------------------------------------------------------------------
router.get("/billing/status", async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const plan = user.plan as "free" | "lifetime";

  if (plan === "lifetime") {
    res.json({
      plan: "lifetime",
      trialActive: false,
      trialHoursLeft: 0,
      upgradeRequired: false,
    });
    return;
  }

  // Free user — calculate trial state
  let trialActive = false;
  let trialHoursLeft = 0;
  const TRIAL_HOURS = 48;

  if (!user.trialStartedAt) {
    // Trial hasn't started yet (user hasn't generated any recipes)
    trialActive = true;
    trialHoursLeft = TRIAL_HOURS;
  } else {
    const hoursElapsed = (Date.now() - user.trialStartedAt.getTime()) / 3_600_000;
    trialActive = hoursElapsed < TRIAL_HOURS;
    trialHoursLeft = Math.max(0, TRIAL_HOURS - hoursElapsed);
  }

  res.json({
    plan: "free",
    trialActive,
    trialHoursLeft: Math.round(trialHoursLeft * 10) / 10,
    upgradeRequired: !trialActive,
  });
});

// ---------------------------------------------------------------------------
// POST /billing/checkout
// Body: { type: "full" | "split_first" }
// ---------------------------------------------------------------------------
router.post("/billing/checkout", async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { type } = req.body as { type?: string };
  if (type !== "full" && type !== "split_first") {
    res.status(400).json({ error: "type must be 'full' or 'split_first'" });
    return;
  }

  const stripe = getStripe();
  const origin = getPublicOrigin();

  // Ensure the user has a Stripe customer
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // If already on lifetime — nothing to do
  if (user.plan === "lifetime") {
    res.status(400).json({ error: "Already on lifetime plan" });
    return;
  }

  let stripeCustomerId = user.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
      metadata: { userId },
    });
    stripeCustomerId = customer.id;
    await db.update(usersTable).set({ stripeCustomerId }).where(eq(usersTable.id, userId));
  }

  const isSplit = type === "split_first";
  const amount = isSplit ? SPLIT_PRICE_PENCE : FULL_PRICE_PENCE;
  const label = isSplit ? "Recipe Genie — First instalment (£10 of £20)" : "Recipe Genie — Lifetime Access";

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: stripeCustomerId,
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "gbp",
          product_data: {
            name: label,
            description: isSplit
              ? "Pay £10 now to unlock full access. The remaining £10 will be charged in 30 days."
              : "One-off lifetime access to Recipe Genie — pay once, yours forever.",
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    // Save payment method for the split second charge
    payment_intent_data: isSplit
      ? { setup_future_usage: "off_session", metadata: { userId, type: "split_first" } }
      : { metadata: { userId, type: "full" } },
    metadata: { userId, type },
    // After payment: API redirects to deep link so the mobile WebBrowser returns
    success_url: `${origin}/api/billing/return?status=success`,
    cancel_url: `${origin}/api/billing/return?status=cancel`,
    // Enable all available wallets (Apple Pay, Google Pay, Link etc)
    payment_method_types: ["card", "link"],
    // Show PayPal if available in the account's region
    // "paypal" requires Stripe dashboard activation — omit to avoid error on accounts without it
    allow_promotion_codes: false,
    phone_number_collection: { enabled: false },
  };

  const session = await stripe.checkout.sessions.create(sessionParams);
  res.json({ url: session.url });
});

// ---------------------------------------------------------------------------
// GET /billing/return  — intermediary redirect to deep link after Stripe payment
// This route needs no auth; Stripe sends the user here after checkout.
// ---------------------------------------------------------------------------
router.get("/billing/return", (req: Request, res: Response) => {
  const status = req.query.status === "success" ? "success" : "cancel";
  // Redirect to the app's custom scheme — WebBrowser.openAuthSessionAsync detects this
  res.redirect(`recipegenie://upgrade?status=${status}`);
});

// ---------------------------------------------------------------------------
// POST /billing/webhook  — Stripe webhook (mounted with raw body in app.ts)
// ---------------------------------------------------------------------------
export const webhookHandler = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not set — webhook rejected");
    res.status(500).json({ error: "Webhook secret not configured" });
    return;
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(req.body as Buffer, sig as string, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const type = session.metadata?.type as "full" | "split_first" | undefined;

    if (!userId) {
      res.json({ received: true });
      return;
    }

    if (type === "full") {
      // Full £20 paid — grant lifetime immediately
      await db
        .update(usersTable)
        .set({ plan: "lifetime", paidAt: new Date(), installmentsPaid: 2 })
        .where(eq(usersTable.id, userId));
    } else if (type === "split_first") {
      // First £10 paid — grant lifetime now, schedule second charge later
      // Retrieve the PaymentIntent to get the saved payment method
      let paymentMethodId: string | null = null;
      if (session.payment_intent && typeof session.payment_intent === "string") {
        try {
          const pi = await getStripe().paymentIntents.retrieve(session.payment_intent);
          if (pi.payment_method && typeof pi.payment_method === "string") {
            paymentMethodId = pi.payment_method;
          }
        } catch (e) {
          console.warn("Could not retrieve payment method from PaymentIntent:", e);
        }
      }

      await db
        .update(usersTable)
        .set({
          plan: "lifetime",
          paidAt: new Date(),
          installmentsPaid: 1,
          ...(paymentMethodId ? { stripePaymentMethodId: paymentMethodId } : {}),
        })
        .where(eq(usersTable.id, userId));

      // TODO: Schedule second £10 charge in 30 days using a cron job or Railway scheduled task.
      // When fired: stripe.paymentIntents.create({ amount: 1000, currency: "gbp",
      //   customer: stripeCustomerId, payment_method: stripePaymentMethodId,
      //   confirm: true, off_session: true })
    }
  }

  res.json({ received: true });
};

export default router;
