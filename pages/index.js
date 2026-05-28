import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Nav from "../components/Nav";
import config from "../config.js";

const PAZE_SCRIPT = {
  sandbox:
    "https://checkout.wallet.uat.earlywarning.io/web/resources/js/digitalwallet-sdk.js",
  production: "https://checkout.paze.com/web/resources/js/digitalwallet-sdk.js",
};

export default function Home({ server, amount, currency }) {
  const [status, setStatus] = useState("Loading…");
  const [result, setResult] = useState(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const sessionId =
      Date.now().toString(36) + Math.random().toString(36).slice(2);
    const transactionValue = {
      transactionAmount: (amount / 100).toFixed(2),
      transactionCurrencyCode: currency,
    };

    (async () => {
      try {
        const sessionRes = await fetch("/api/session");
        if (!sessionRes.ok) {
          throw new Error(`session ${sessionRes.status}`);
        }
        const session = await sessionRes.json();
        await loadScript(PAZE_SCRIPT[server] || PAZE_SCRIPT.sandbox);
        const paze = window.DIGITAL_WALLET_SDK;
        await paze.initialize({ client: session });
        setStatus(JSON.stringify(session));
        const button = document.getElementById("paze-button");
        button.addEventListener("click", async () => {
          try {
            setStatus("Running Paze checkout…");
            const { checkoutResponse, result } = await paze.checkout({
              acceptedPaymentCardNetworks: [],
              sessionId,
              actionCode: "START_FLOW",
              confirmLaunch: false,
              intent: "REVIEW_AND_PAY",
              transactionValue,
              shippingPreference: "ALL",
            });
            console.log("checkoutResult:", checkoutResponse);
            if (result !== "COMPLETE") {
              setStatus(
                `Checkout did not complete (${checkoutResponse?.actionCode ?? "unknown"})`,
              );
              return;
            }

            setStatus("Finalising Paze response…");
            const { completeResponse } = await paze.complete({
              transactionOptions: {
                billingPreference: "ALL",
                merchantCategoryCode: "US",
                payloadTypeIndicator: "PAYMENT",
              },
              transactionId: "",
              emailAddress: null,
              sessionId,
              transactionType: "PURCHASE",
              transactionValue,
            });
            console.log("completeResponse:", completeResponse);
            if (!completeResponse) {
              setStatus(
                "Paze complete() returned no token; not creating transaction",
              );
              return;
            }
            setStatus("Creating Gr4vy transaction…");
            const txnRes = await fetch("/api/transaction", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                completeResponse,
                checkoutResponse,
              }),
            });
            const txn = await txnRes.json();
            setResult(txn);
            setStatus(
              `Transaction ${txn.id || "?"}: ${txn.status || txn.error || "submitted"}`,
            );
          } catch (e) {
            console.error(e);
            setStatus(`Checkout error: ${e.message}`);
          }
        });
      } catch (e) {
        console.error(e);
        setStatus(`Error: ${e.message}`);
      }
    })();
  }, [amount, currency, server]);

  return (
    <>
      <Head>
        <title>Gr4vy + Paze sample</title>
      </Head>
      <main
        style={{
          fontFamily: "system-ui, sans-serif",
          padding: 32,
          maxWidth: 720,
        }}
      >
        <Nav />
        <h1>Gr4vy + Paze</h1>
        <p>
          Amount: ${(amount / 100).toFixed(2)} {currency}
        </p>
        <p>Status: {status}</p>
        <div style={{ margin: "20px 0", width: 250 }}>
          <paze-button
            id="paze-button"
            color="paze-blue"
            disablemaxheight=""
            label="Check out with"
            shape="default"
          />
        </div>
        {result && (
          <pre
            style={{
              background: "#f6f8fa",
              padding: 16,
              overflow: "auto",
              fontSize: 12,
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </main>
    </>
  );
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if ([...document.scripts].some((s) => s.src === src)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.appendChild(script);
  });
}

export async function getServerSideProps() {
  return {
    props: {
      server: config.server,
      amount: config.amount,
      currency: config.currency,
    },
  };
}
