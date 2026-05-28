import { gr4vy, config } from "../../lib/gr4vy";

export default async function handler(req, res) {
  try {
    const session = await gr4vy.digitalWallets.sessions.paze({
      domainName: config.merchantDomainName,
    });
    res.status(200).json(session);
  } catch (err) {
    console.error("session error", err);
    res.status(500).json({ error: err.message });
  }
}
