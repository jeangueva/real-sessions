# Deploying

One container serves the API and the built web app. It needs Postgres and Redis
beside it, and it **refuses to start** without every variable in the required
table below — each of those failures is silent data loss or a security hole if
it degrades instead of stopping.

## Required

| Variable | Why it is required rather than optional |
| --- | --- |
| `DATABASE_URL` | Progress, metrics, XP and badges. Degrading to memory would lose them on every restart, silently |
| `REDIS_URL` | Interviews in flight, and rate limits. Per-process limits multiply by the number of instances |
| `REALSESSIONS_SESSION_SECRET` | Signs identity cookies. At least 32 characters. An ephemeral one signs everyone out on each restart |
| `RESEND_API_KEY` + `EMAIL_FROM` | Without them password-reset links are printed to the log instead of sent, which is a log full of account-takeover tokens |

Generate the secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`EMAIL_FROM` must be on a domain verified with Resend, or every send is
rejected with a 422.

## Optional

Each of these degrades on its own and says so in the startup line.

| Variable | Missing means |
| --- | --- |
| `DEEPGRAM_API_KEY` | Browser speech recognition instead of streaming transcription |
| `MERCADOPAGO_*` | The paid plan is reachable only by an early-access grant; the app says payments are off rather than offering a broken button |
| `REALSESSIONS_REVIEWERS` | Nobody can verify contributed questions, so none reach an interview |
| `REALSESSIONS_SITE_URL` | Links in emails point at `http://localhost:5173` |
| `REALSESSIONS_TRUST_PROXY=1` | Set **only** behind a proxy you control. Otherwise any caller can rotate `X-Forwarded-For` and mint unlimited rate-limit identities |

## Render (recommended)

`render.yaml` declares the whole stack — a Docker web service, Postgres, and
Redis, wired to each other. Connect the repo in the dashboard and Render reads
it. **No CLI and no local callback**, which is the reason it is the recommended
path: the platform CLIs authenticate through a browser callback with a deadline,
and that is the step that fails when it fails.

Postgres is on a paid tier (`0.1c-256mb`, $6/month) because the free one expires
after 30 days and deletes the data with it — transcripts, progress, XP, badges.
That is not a limit to discover the hard way.

The web service is on `0.5c-512mb` ($7/month) so it stops sleeping after fifteen
minutes idle — a cold start in the middle of an interview loses the candidate at
the worst possible moment.

Redis stays free on purpose. It holds interviews in flight and rate-limit
counters, both of which already expire; eviction under pressure loses nothing
that was not about to lapse.

Every plan identifier is Render's own, named for CPU and memory —
`0.5c-512mb`, `0.1c-256mb`. Not `starter` or `basic-256mb`; neither exists, and
both were in this file until someone opened the plan picker.

Both paid plans require a card on file, which Render asks for in its own
dashboard.

1. render.com → New → Blueprint → connect this repository.
2. Render finds `render.yaml` and shows the three services it will create.
3. It prompts for every secret marked `sync: false`. The four that matter:

   | | |
   | --- | --- |
   | `RESEND_API_KEY`, `EMAIL_FROM` | **Required.** The service will not start without them |
   | `OPENROUTER_API_KEY` | **Required.** No model, no interview |
   | `REALSESSIONS_SITE_URL` | Your Render URL. Unset, every emailed link points at localhost |

   The rest are optional and each degrades on its own.
4. Apply. `DATABASE_URL`, `REDIS_URL` and the cookie secret are filled in by
   Render itself.

All three services share a region so Postgres and Redis are reached over the
private network. Redis has an empty `ipAllowList`, so it is not exposed at all.

`REALSESSIONS_TRUST_PROXY=1` is set because Render terminates TLS in front of
the app, which makes `X-Forwarded-For` the real client. It is off everywhere
else on purpose: without a proxy in front, anyone can rotate that header and
mint unlimited rate-limit identities.

After the first deploy, set `REALSESSIONS_SITE_URL` to the real URL and — if you
use Mercado Pago — point its webhook at `https://<your-url>/api/billing/webhook`.

## Railway

```bash
railway login
railway init                       # or: railway link, for an existing project
railway add --database postgres
railway add --database redis

# Railway injects DATABASE_URL and REDIS_URL from the plugins above.
railway variables set \
  REALSESSIONS_SESSION_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" \
  RESEND_API_KEY="re_..." \
  EMAIL_FROM="Real Sessions <no-reply@yourdomain>" \
  REALSESSIONS_SITE_URL="https://yourdomain" \
  NODE_ENV=production

railway up
```

`railway.json` pins the Dockerfile builder and points the healthcheck at
`/api/voice/config` — a route in front of the authentication gate, so a healthy
container is not reported as unhealthy for want of a cookie.

## Anywhere else

The image is ordinary. Anything that runs a container works:

```bash
docker build -t realsessions .
docker run -p 8787:8787 --env-file .env.production realsessions
```

**Not Cloudflare Workers**, without a rewrite. The server is `node:http`, talks
to Postgres over TCP, and holds WebSockets open for the length of an answer.
Workers would need Durable Objects for the sockets and Hyperdrive for the
database, which is a port rather than a deploy.

## After the first deploy

- Point `REALSESSIONS_SITE_URL` at the real domain, or reset emails link to
  localhost.
- If you use Mercado Pago, set the webhook to
  `https://yourdomain/api/billing/webhook` — it cannot reach localhost, which is
  why the signature path is untestable locally.
- The schema applies itself on boot. Every statement is `IF NOT EXISTS`, so
  there is no migration step and a restart is a no-op.
