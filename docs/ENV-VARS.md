# Environment Variables

## One file to edit

All environment variables live in the **root `.env`** — the single source of truth:

```bash
cp .env.example .env    # once
# fill in values, then:
pnpm run env:sync       # also runs automatically before `pnpm run dev`
```

`env:sync` (`scripts/sync-env.js`) generates the file Next.js requires:

```
.env  ──►  frontend/.env.local   (read by Next.js)
```

**Never edit the generated file** — it carries a header saying so, and the next sync overwrites it. Both files are gitignored.

## Variables (defined in root `.env`)

| Variable                                   | Secret  | Required | Description                                                                                 |
| ------------------------------------------ | ------- | -------- | ------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | No      | Yes      | Firebase project id — must match `.firebaserc`. Synced under the same name to the frontend. |
| `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64`      | **Yes** | Yes      | Base64-encoded service account JSON. Synced to the frontend; server-only.                   |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | No      | Yes      | Firebase web app config → `apiKey`                                                          |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | No      | Yes      | Web app config → `authDomain`                                                               |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | No      | Yes      | Web app config → `messagingSenderId`                                                        |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | No      | Yes      | Web app config → `appId`                                                                    |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`      | No      | No       | Web app config → `measurementId` (only if Analytics is on)                                  |
| `NEXT_PUBLIC_APP_URL`                      | No      | Yes      | Public app URL (`http://localhost:3000` locally)                                            |
| `NEXT_PUBLIC_APP_NAME`                     | No      | Yes      | App display name                                                                            |
| `STITCH_API_KEY`                           | **Yes** | No       | Google Stitch key for the Claude Code MCP (stays in root `.env` only)                       |

`NEXT_PUBLIC_*` values are compiled into the browser bundle — that prefix must **never** appear on a secret (a Claude Code hook blocks this).

## Generating the Service Account Key (Base64)

1. Go to **Firebase Console → Project Settings → Service Accounts**
2. Click **Generate new private key** — save the JSON file securely
3. Convert to base64:
   ```bash
   # macOS (BSD base64 — no -w flag)
   base64 -i service-account.json | tr -d '\n'

   # Linux (GNU base64)
   base64 -w 0 service-account.json

   # Windows PowerShell (single quotes around the path)
   [Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\path\service-account.json'))
   ```
4. Paste the result as `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64` in `.env`, run `pnpm run env:sync`
5. Delete the JSON file — it now lives in the env var

**Never commit the service account JSON or the base64 string to version control.**

## Production Secrets (GitHub Actions)

The root `.env` is for local development only. For CI/CD, add repository secrets in **GitHub → Settings → Secrets → Actions**:

- All `NEXT_PUBLIC_FIREBASE_*` variables
- `NEXT_PUBLIC_APP_NAME`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT_KEY_BASE64`

See `docs/CI-CD.md` for the full list and how they're used.

## Adding a New Variable

Use the `/add-env-var` Claude Code skill — it updates `.env.example`, `scripts/sync-env.js` (so the value reaches the right package), and this file consistently.
