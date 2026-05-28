import { config, gr4vy } from "../../lib/gr4vy";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  try {
    const { completeResponse, checkoutResponse } = req.body || {};
    const transaction = await gr4vy.transactions.create({
      amount: config.amount,
      currency: config.currency,
      country: "US",
      intent: "capture",
      paymentServiceId: config.paymentServiceId,
      paymentMethod: {
        method: "paze",
        token: completeResponse,
        checkoutToken: checkoutResponse,
      },
    });

    res.status(200).json(transaction);
  } catch (err) {
    console.error("transaction error", err);
    res.status(500).json({ error: err.message });
  }
}
