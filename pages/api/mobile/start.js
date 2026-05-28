import { gr4vy, config } from "../../../lib/gr4vy";

const ALLOWED_INTENTS = ["REVIEW_AND_PAY", "EXPRESS_CHECKOUT"];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  const intent = req.body?.intent ?? "REVIEW_AND_PAY";
  if (!ALLOWED_INTENTS.includes(intent)) {
    res.status(400).json({ error: `intent must be one of ${ALLOWED_INTENTS.join(", ")}` });
    return;
  }

  try {
    const session = await gr4vy.digitalWallets.sessions.paze({
      source: "mobile",
      domainName: config.merchantDomainName,
    });

    const { id, name, profileId, accessToken, sessionId } = session;
    const callbackURLScheme = `${getOrigin(req)}/paze/return`;

    const create = await gr4vy.digitalWallets.sessions.pazeMobileSessionCreate({
      client: { id, name, profileId },
      sessionId,
      accessToken,
      callbackURLScheme,
      intent,
      transactionValue: {
        transactionAmount: (config.amount / 100).toFixed(2).toString(),
        transactionCurrency: config.currency,
      },
      transactionType: "PURCHASE",
      shippingPreference: "ALL",
      billingPreference: "ALL",
    });

    res.status(200).json({
      pazeCheckoutUrl: create.pazeCheckoutUrl,
      accessToken,
      sessionId,
      intent,
    });
  } catch (err) {
    console.error("mobile/start error", err);
    res.status(500).json({ error: err.message });
  }
}

function getOrigin(req) {
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}
