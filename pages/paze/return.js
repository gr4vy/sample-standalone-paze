import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Nav from '../../components/Nav';

const STATE_KEY = 'paze-mobile-state';

export default function PazeReturn() {
  const [status, setStatus] = useState('Parsing Paze response…');
  const [result, setResult] = useState(null);
  const [missing, setMissing] = useState(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      const callbackStatus = new URLSearchParams(window.location.search).get('status');
      if (callbackStatus && callbackStatus !== 'success') {
        setStatus(`Paze callback status: ${callbackStatus} — not finalising.`);
        return;
      }

      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;
      const params = new URLSearchParams(hash);
      const response = params.get('response');
      console.log('paze return response:', response);

      if (!response) {
        setMissing(
          'No `response` parameter in the URL hash. Paste the response on /mobile instead.',
        );
        setStatus('Missing response');
        return;
      }

      const raw = sessionStorage.getItem(STATE_KEY);
      if (!raw) {
        setMissing(
          'No saved session state — start the flow on /mobile first, then return here.',
        );
        setStatus('Missing session state');
        return;
      }
      const { accessToken, sessionId, intent } = JSON.parse(raw);

      let code;
      try {
        code = atob(response);
      } catch {
        code = response;
      }

      setStatus(
        callbackStatus
          ? `Paze callback status: ${callbackStatus} — finalising via /api/mobile/finalize…`
          : 'Finalising via /api/mobile/finalize…',
      );
      try {
        const res = await fetch('/api/mobile/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, accessToken, sessionId, intent }),
        });
        const txn = await res.json();
        setResult(txn);
        setStatus(
          res.ok
            ? `Transaction ${txn.id || '?'}: ${txn.status || 'submitted'}`
            : `Error: ${txn.error || res.status}`,
        );
      } catch (err) {
        console.error(err);
        setStatus(`Error: ${err.message}`);
      }
    })();
  }, []);

  return (
    <>
      <Head>
        <title>Paze return</title>
      </Head>
      <main style={{ fontFamily: 'system-ui, sans-serif', padding: 32, maxWidth: 720 }}>
        <Nav />
        <h1>Paze return</h1>
        <p>Status: {status}</p>
        {missing && (
          <p style={{ color: '#a00' }}>
            {missing} <Link href="/mobile">Go to /mobile</Link>
          </p>
        )}
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
