This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Orchestrator Backend (FastAPI)

We ship a local Python backend in `orchestrator/` that powers the "Configure SEO Agent" and "Start Review" actions.

### Setup

1. Create a Python virtualenv and install deps:

```bash
cd orchestrator
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Create `orchestrator/.env` (optional) and set:

```
ANTHROPIC_API_KEY=...      # required to use Claude
MORPH_API_KEY=...          # optional; fallback merge occurs if missing
ORCH_HOST=127.0.0.1
ORCH_PORT=8001
```

3. Run the server:

```bash
uvicorn orchestrator.app:app --host 0.0.0.0 --port 8001 --reload
```

4. Run the Next.js app from another terminal:

```bash
npm run dev
```

The Next app proxies to the orchestrator via `/api/agent/*`. You can change the backend URL by setting `ORCH_URL` in the Next.js env (`.env.local`).

