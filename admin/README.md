# Mockio admin

Growth numbers and the user list, at `admin.getmockio.com`, for the team only.
A separate Render service (`mockio-admin` in `render.yaml`, free plan) that can
only read.

## Who gets in

1. **Cloudflare Access** (Zero Trust → Access → Applications → Add →
   Self-hosted): domain `admin.getmockio.com`, a policy *Allow* with your
   emails, login method Google. Copy the **Application Audience (AUD) tag**.
2. **The service checks the same token.** Requests that skip Cloudflare (the
   `onrender.com` address) carry no Access token and get `403`.

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

2. **Redis**: `ADMIN_REDIS_URL`. If your Redis supports ACLs, a user limited
   to reading account records:
   `ACL SETUSER mockio_admin on >'<password>' ~rs:account:* +get +mget +scan +ping`.
   Otherwise the production `REDIS_URL`; the service only ever reads.

3. **Render**: New → Blueprint sync (or a Web Service from this repo with the
   settings in `render.yaml`). Environment:

   | Key | Value |
   |---|---|
   | `CF_ACCESS_TEAM_DOMAIN` | your team name, e.g. `mockio` |
   | `CF_ACCESS_AUD` | the AUD tag from step 1 above |
   | `ADMIN_EMAILS` | `you@gmail.com,partner@gmail.com` |
   | `ADMIN_DATABASE_URL` | the read-only URL |
   | `ADMIN_REDIS_URL` | the Redis URL |

4. **DNS**: in Render, add the custom domain `admin.getmockio.com` to the
   service; in Cloudflare, the CNAME it asks for, **proxied** (orange cloud),
   so traffic passes through Access.

## Local

```bash
ADMIN_DEV_EMAIL=you@local npm run admin
```

Skips the Access check (refused when `NODE_ENV=production`) and reads whatever
`DATABASE_URL` and `REDIS_URL` point at.
