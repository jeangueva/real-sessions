# Mockio admin

Growth numbers and the user list, for the team only. A separate Render
service (`mockio-admin` in `render.yaml`, free plan) that can only read.

## Who gets in

Only addresses in `ADMIN_EMAILS`. You type your email, a six-digit code
arrives (valid ten minutes, five guesses), and you stay signed in for a day.
Every request to send a code gets the same answer, so the form does not reveal
who the admins are. Removing an address from `ADMIN_EMAILS` signs it out at
once.

## Setup

1. **Read-only Postgres role**, once, with `psql` on the production database:

   ```sql
   CREATE ROLE mockio_admin LOGIN PASSWORD '<a long random password>';
   GRANT CONNECT ON DATABASE <database> TO mockio_admin;
   GRANT USAGE ON SCHEMA public TO mockio_admin;
   GRANT SELECT ON sessions, entitlements, subscriptions TO mockio_admin;
   ```

   `ADMIN_DATABASE_URL` is the production URL with this user and password.
   Every connection is also forced read-only by the service itself.

2. **Render**: New → Web Service from this repo (or Blueprint sync), with the
   settings in `render.yaml`: Node, build `npm ci --include=dev`, start
   `npm run admin`, health check `/healthz`, instance **Free**. Environment:

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `ADMIN_EMAILS` | `you@gmail.com,partner@gmail.com` |
   | `ADMIN_SESSION_SECRET` | 40+ random characters (Render: *Generate*) |
   | `RESEND_API_KEY`, `EMAIL_FROM` | the same as the product |
   | `ADMIN_DATABASE_URL` | the read-only URL from step 1 |
   | `ADMIN_REDIS_URL` | the product's Redis URL (only read) |

3. **Domain (optional)**: in Render, add `admin.getmockio.com` to the service;
   at your DNS provider, the CNAME Render asks for. Without it, the
   `onrender.com` address works the same.

## Local

```bash
ADMIN_EMAILS=you@example.com ADMIN_SESSION_SECRET=$(openssl rand -hex 24) npm run admin
```

Reads whatever `DATABASE_URL` and `REDIS_URL` point at. Without an email
provider configured, the code is printed to the console.
