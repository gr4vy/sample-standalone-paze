import { useState } from 'react';
import Head from 'next/head';
import Nav from '../components/Nav';
import config from '../config.js';

const STATE_KEY = 'paze-mobile-state';

export default function Mobile({ amount, currency }) {
  const [status, setStatus] = useState('Ready');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [intent, setIntent] = useState('REVIEW_AND_PAY');

  async function start() {
    setBusy(true);
    setResult(null);
    setStatus('Creating mobile session…');
    try {
      const res = await fetch('/api/mobile/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `start ${res.status}`);

      const { pazeCheckoutUrl, accessToken, sessionId } = data;
      sessionStorage.setItem(
        STATE_KEY,
        JSON.stringify({ accessToken, sessionId, intent }),
      );
      setStatus(`Redirecting to ${pazeCheckoutUrl}`);
      window.location.assign(pazeCheckoutUrl);
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
      setBusy(false);
    }
  }

  return (
    <>
      <Head>
        <title>Gr4vy + Paze (mobile)</title>
      </Head>
      <main style={{ fontFamily: 'system-ui, sans-serif', padding: 32, maxWidth: 720 }}>
        <Nav />
        <h1>Gr4vy + Paze — mobile flow</h1>
        <p>
          Amount: ${(amount / 100).toFixed(2)} {currency}
        </p>
        <p>Status: {status}</p>

        <fieldset
          disabled={busy}
          style={{ border: 0, padding: 0, margin: '12px 0', display: 'flex', gap: 16 }}
        >
          <legend style={{ fontSize: 13, color: '#555', padding: 0 }}>Intent:</legend>
          <label>
            <input
              type="radio"
              name="intent"
              value="REVIEW_AND_PAY"
              checked={intent === 'REVIEW_AND_PAY'}
              onChange={(e) => setIntent(e.target.value)}
            />{' '}
            Review &amp; pay
          </label>
          <label>
            <input
              type="radio"
              name="intent"
              value="EXPRESS_CHECKOUT"
              checked={intent === 'EXPRESS_CHECKOUT'}
              onChange={(e) => setIntent(e.target.value)}
            />{' '}
            Express checkout
          </label>
        </fieldset>

        <div style={{ margin: '20px 0' }}>
          <button
            onClick={start}
            disabled={busy}
            style={{
              padding: '12px 20px',
              background: '#0e3a8a',
              color: 'white',
              border: 0,
              borderRadius: 6,
              fontSize: 16,
              cursor: busy ? 'wait' : 'pointer',
            }}
          >
            Start Paze mobile checkout
          </button>
        </div>

        {result && (
          <pre
            style={{
              background: '#f6f8fa',
              padding: 16,
              overflow: 'auto',
              fontSize: 12,
              marginTop: 24,
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </main>
    </>
  );
}

export async function getServerSideProps() {
  return {
    props: {
      amount: config.amount,
      currency: config.currency,
    },
  };
}
