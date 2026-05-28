import { gr4vy, config } from "../../../lib/gr4vy";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  try {
    const { code, accessToken, sessionId, intent } = req.body || {};
    if (!code || !accessToken || !sessionId) {
      res
        .status(400)
        .json({ error: "code, accessToken, and sessionId are required" });
      return;
    }

    let completeCode = code;
    if (intent === "REVIEW_AND_PAY") {
      const review =
        await gr4vy.digitalWallets.sessions.pazeMobileSessionReview({
          sessionId,
          code,
          accessToken,
        });
      completeCode = review.code;
    }

    const complete =
      await gr4vy.digitalWallets.sessions.pazeMobileSessionComplete({
        sessionId,
        code: completeCode,
        accessToken,
        transactionType: "PURCHASE",
        transactionOptions: {
          merchantCategoryCode: "2213",
          billingPreference: "ALL",
          payloadTypeIndicator: "PAYMENT",
        },
        transactionValue: {
          transactionAmount: (config.amount / 100).toFixed(2),
          transactionCurrency: config.currency,
        },
      });

    const transaction = await gr4vy.transactions.create({
      amount: config.amount,
      currency: config.currency,
      country: "US",
      intent: "capture",
      paymentMethod: {
        method: "paze",
        token: complete.completeResponse,
        checkoutToken: code,
      },
      ...(config.paymentServiceId
        ? { paymentServiceId: config.paymentServiceId }
        : {}),
    });

    res.status(200).json(transaction);
  } catch (err) {
    console.error("mobile/finalize error", err);
    res.status(500).json({ error: err.message });
  }
}
