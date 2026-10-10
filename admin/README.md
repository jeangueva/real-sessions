# Mockio admin

Growth numbers, users, coupons and recommendations, for the team only. A
separate Render service (`mockio-admin` in `render.yaml`, free plan).

What it can change, and nothing else: give or remove premium, mark an email
verified, rename a user, create or disable a coupon. Every change is written
to `admin_audit` with who made it (the Actividad page). Reading goes through a
connection forced read-only.

## Who gets in

Only addresses in `ADMIN_EMAILS`. You type your email, a six-digit code
arrives (valid ten minutes, five guesses), and you stay signed in for a day.
Every request to send a code gets the same answer, so the form does not reveal
who the admins are. Removing an address from `ADMIN_EMAILS` signs it out at
once.

## Setup

1. **Postgres role for the admin**, once, with `psql` on the production
   database, after the product has deployed (it creates `admin_audit`):

   ```sql
   CREATE ROLE mockio_admin LOGIN PASSWORD '<a long random password>';
   GRANT CONNECT ON DATABASE <database> TO mockio_admin;
   GRANT USAGE ON SCHEMA public TO mockio_admin;
   GRANT SELECT ON sessions, turns, entitlements, subscriptions, promo_codes, admin_audit TO mockio_admin;
   GRANT INSERT, UPDATE ON entitlements, promo_codes TO mockio_admin;
   GRANT INSERT ON admin_audit TO mockio_admin;
   GRANT USAGE ON SEQUENCE entitlements_id_seq, admin_audit_id_seq TO mockio_admin;
   ```

   `ADMIN_DATABASE_URL` is the production URL with this user and password.
   It can read interviews but never change them, and cannot delete anything.

2. **Render**: New → Web Service from this repo (or Blueprint sync), with the
   settings in `render.yaml`: Node, build `npm ci --include=dev`, start
   `npm run admin`, health check `/healthz`, instance **Free**. Environment:

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `ADMIN_EMAILS` | `you@gmail.com,partner@gmail.com` |
   | `ADMIN_SESSION_SECRET` | 40+ random characters (Render: *Generate*) |
   | `RESEND_API_KEY`, `EMAIL_FROM` | the same as the product |
   | `ADMIN_DATABASE_URL` | the admin role's URL from step 1 |
   | `ADMIN_REDIS_URL` | the product's Redis URL (accounts and names) |
   | `OPENROUTER_API_KEY` | the product's, for the AI review |
   | `ADMIN_INSIGHTS_MODEL` | `anthropic/claude-sonnet-5.5` (any OpenRouter id) |

3. **Domain (optional)**: in Render, add `admin.getmockio.com` to the service;
   at your DNS provider, the CNAME Render asks for. Without it, the
   `onrender.com` address works the same.

## Local

```bash
ADMIN_EMAILS=you@example.com ADMIN_SESSION_SECRET=$(openssl rand -hex 24) npm run admin
```

Reads whatever `DATABASE_URL` and `REDIS_URL` point at. Without an email
provider configured, the code is printed to the console.
