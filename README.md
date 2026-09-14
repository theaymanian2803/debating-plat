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

1. Import the repository at [vercel.com/new](https://vercel.com/new). Vercel
   detects TanStack Start and Nitro automatically, so no build settings are
   required.
2. Add the environment variables `TURSO_URL` and `TURSO_AUTH_TOKEN`
   (Project Settings → Environment Variables).
3. Deploy. Every push to `main` ships a new version.

