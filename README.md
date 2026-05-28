# sample-standalone-paze

A standalone Next.js sample app demonstrating end-to-end Paze (the US bank-led
digital wallet from Early Warning Services) checkout through Gr4vy. Mirrors the
architecture of [`sample-standalone-plaid`](https://github.com/gr4vy/sample-standalone-plaid).

The app:

1. Calls `POST /digital-wallets/paze/session` on Gr4vy to fetch the merchant
   `id`, `name`, and `profileId` for the Paze JS SDK.
2. Loads the Paze JS SDK, initialises it with those values, and renders a
   `<paze-button>`.
3. On click, runs `paze.checkout()` then `paze.complete()`. The opaque
   token returned from `complete()` is sent to `POST /transactions` on
   Gr4vy to create the transaction.

## Prerequisites

- Node 22 or later
- A Gr4vy account with a Paze digital wallet configured
- The domain_name that was registered with the Paze digital wallet payment service

## Setup

```sh
cp config.js.example config.js
```

Edit `config.js`:

| Field                | Description                                                                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                 | Your Gr4vy ID (the subdomain)                                                                                                                       |
| `server`             | `"sandbox"` or `"production"`                                                                                                                       |
| `paymentServiceId`   | Optional. UUID of the Paze payment service configured in your Gr4vy dashboard. If omitted, flow rules will determine which payment service is used. |
| `amount`             | Transaction amount in the smallest currency unit (e.g. `5021` = $50.21)                                                                             |
| `currency`           | ISO 4217 currency code (e.g. `"USD"`)                                                                                                               |
| `merchantDomainName` | The domain name that was registered with the Paze merchant account                                                                                  |
| `apiBaseUrl`         | Optional. Override the API base URL (e.g. `"http://localhost:8000"`)                                                                                |

Generate a Gr4vy API private key from the dashboard ([instructions](https://docs.gr4vy.com/guides/api/authentication#create-an-api-key)) and save it as `private_key.pem` in the repo root (use the dashboard of the corresponding Gr4vy instance — i.e. spider/example009/local etc.).

```sh
pnpm install
pnpm dev
```

Open <http://localhost:4000>.

### Pointing at a local core-api

To iterate against a core-api instance running on your machine, add
`apiBaseUrl` to `config.js` (e.g. `"http://localhost:8000"`). The `server` config variable is
ignored when `apiBaseUrl` is set.

### HTTPS / domain allowlisting

Paze doesn't seem to enforce the registered domains, so we can load the script on localhost or anywhere else. If this change in future we may need to use ngrok and register the ngrok domain to the Paze domain list in the Gr4vy instance being used.

## Architecture

The app exposes two flows via a small nav at the top of every page:

- `/` — **web** flow (Paze JS SDK in-page).
- `/mobile` — **mobile** flow (server-side orchestration + redirect to Paze).

### Web flow (`/`)

- `pages/api/session.js` — server-side. Calls
  `gr4vy.digitalWallets.sessions.paze({ domainName: config.merchantDomainName })`
  via `@gr4vy/sdk`. Returns `{ id, name, profileId }`, which is the exact shape
  Paze's `initialize({ client })` expects.
- `pages/api/transaction.js` — server-side. Calls `gr4vy.transactions.create`
  with `paymentMethod: { method: 'paze', token }` where `token` is the opaque
  token returned by `paze.complete()` (per `PazePaymentMethodCreate` in
  `@gr4vy/sdk`).
- `pages/index.js` — frontend. Fetches the session, dynamically loads the Paze
  SDK script (`checkout.wallet.uat.earlywarning.io` for sandbox or
  `checkout.paze.com` for production), initialises it, wires the
  `<paze-button>` to call `paze.checkout()` then `paze.complete()`, and posts
  the `complete()` response to `/api/transaction`.

### Mobile flow (`/mobile`)

Simulates the native mobile workflow end-to-end against the Gr4vy API:

1. On `/mobile`, pick the **intent** (`REVIEW_AND_PAY` default, or `EXPRESS_CHECKOUT`) and click Start. `POST /api/mobile/start` (server) calls `gr4vy.digitalWallets.sessions.paze({ source: 'mobile', domainName })`, then `gr4vy.digitalWallets.sessions.pazeMobileSessionCreate({ ..., callbackURLScheme: 'http://<host>/paze/return', intent })`. Returns a `pazeCheckoutUrl` + state.
2. The browser redirects to `pazeCheckoutUrl`. State (`accessToken`, `sessionId`, `intent`) is stashed in `sessionStorage`.
3. Paze redirects back to `/paze/return#response=<base64-jwe>`.
4. `pages/paze/return.js` decodes the JWE and POSTs to `/api/mobile/finalize`.
5. `POST /api/mobile/finalize` (server) calls `gr4vy.digitalWallets.sessions.pazeMobileSessionReview` when `intent === 'REVIEW_AND_PAY'`, then `gr4vy.digitalWallets.sessions.pazeMobileSessionComplete`. The opaque `completeResponse` token is sent to `gr4vy.transactions.create` as `paymentMethod: { method: 'paze', token, checkoutToken }`, where `checkoutToken` is the callback JWE (the same value passed as `code` to `/review`).

**Why the URL bar shows `/paze/return:` after the redirect:** Paze treats
`callbackURLScheme` as a URL scheme identifier and appends `:?<query>#<fragment>`
to it verbatim, so passing `http://localhost:4000/paze/return` produces a
landing URL of `http://localhost:4000/paze/return:?status=success#response=…`.
A small Next.js proxy in `proxy.js` (a `rewrites()` config can't express this —
path-to-regexp parses `:` as a parameter prefix) routes the colon-suffixed
path back to `pages/paze/return.js`, so no code in the page itself has to
care about the colon.

**Callback URL:** the server-side code derives the callback URL from the
request `Host` header, so it works on `http://localhost:4000` out of the box.
If Paze's sandbox rejects a non-HTTPS callback in your environment, expose the
dev server via ngrok and re-add `allowedDevOrigins` to `next.config.js`.

## Troubleshooting

- **`session 500` in browser console**: check `private_key.pem` exists at repo
  root and is the right key for the Gr4vy ID in `config.js`. Check the dev
  server log for the underlying error. If running against a local core-api instance, ensure `make certificates` has been run in the core-api environment to pull the Paze certificates.
- **Paze SDK rejects domain**: the current host isn't in the Paze wallet's
  allowed domains. Add it via the Gr4vy dashboard.
- **Transaction errors with `payment_service_id not found`**: the
  `paymentServiceId` in `config.js` doesn't match a configured payment service
  in this Gr4vy environment.
- **Sandbox vs production mismatch**: `config.server` must match the
  environment where your Paze service is configured. The frontend loads the
  matching Paze SDK script based on this field.
