# Insight Arena

A debate platform for exploring religious texts and philosophy. Browse the corpus in the sidebar, open a verse or premise to see the primary text alongside scholarly commentary, and compare rebuttals from different perspectives. Includes an interactive argument map for visualizing debates and a citation ledger for verifying sources.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Deployment

Deploys to Vercel. Pushing to `main` triggers a production deployment.

1. Push the repository to GitHub (`main` branch).
2. Import the repository at [vercel.com/new](https://vercel.com/new). Vercel
   detects TanStack Start and Nitro automatically (`vercel.json` in this repo
   pins the build command and output directory, so no dashboard build settings
   are required).
3. Add the required environment variables (Project Settings → Environment
   Variables) — set them for Production, Preview, and Development:

   | Variable | Required | Purpose |
   | --- | --- | --- |
   | `TURSO_URL` | yes | Turso database URL (`libsql://…`) |
   | `TURSO_AUTH_TOKEN` | yes | Turso auth token |
   | `ADMIN_PASSWORD` | yes | Password for the editorial desk at `/admin`; without it the admin area shows "not configured" and all admin mutations are blocked |
   | `AI_VERIFY_URL` / `AI_VERIFY_KEY` | no | Enables the AI-assisted source verification suggestion in the citation ledger |

4. Deploy. Every push to `main` ships a new version.

### Deploying from the CLI (alternative)

With the Vercel CLI (`npm i -g vercel`), from the repo root:

```sh
vercel login
vercel link        # links the repo to a Vercel project (creates .vercel/)
vercel env add TURSO_URL
vercel env add TURSO_AUTH_TOKEN
vercel env add ADMIN_PASSWORD
vercel --prod      # builds and deploys .vercel/output
```

Note: `.vercel/` is gitignored, so the CLI link stays local to this machine.

