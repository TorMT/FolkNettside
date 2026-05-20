# Portfolio Template (Generic, Professional)

This folder is a standalone, professional engineering portfolio template intended for safe reuse.
It is generic by design and must not contain real personal data in committed template files.

## Copy to a real portfolio location

```bash
cp -r diverse/portfolio-template portfolio
```

The template works as static files (no build step required).

## Data model and privacy

Do not put real personal data in the `*.example.json` files.
Use local/private files instead:

- `portfolio-data.local.json`
- `portfolio-linkedin.local.json`

These are ignored by Git and intended for local-only personal data.

## Google Analytics (default OFF)

1. Copy `portfolio-data.example.json` to `portfolio-data.local.json`.
2. Set `analytics.enabled = true`.
3. Set `analytics.measurementId` to your own GA4 measurement ID.
4. Verify events in GA DebugView / Realtime.

The template tracks only generic click events and does not send name, email, phone, LinkedIn URL, or similar personal fields as analytics event parameters.

> Note: Google Analytics use in Norway/EEA may require consent and privacy/legal assessment. Therefore analytics is disabled by default.

## LinkedIn sync model (safe best effort)

- Never scrape LinkedIn.
- Never place LinkedIn secrets/tokens in frontend code.
- Manual/local sync via `portfolio-linkedin.local.json` is the recommended safe fallback.
- LinkedIn API usage from a static frontend with secrets is not supported.

### Optional future LinkedIn API integration

If needed later, use backend/serverless architecture:

1. LinkedIn Developer App.
2. OAuth 2.0 Authorization Code Flow.
3. Backend/serverless callback endpoint.
4. Store secrets server-side only (`LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`).
5. Request minimal scopes only.
6. Backend writes/signs a safe public JSON payload.
7. Portfolio frontend reads only the safe public JSON.

Important: standard scopes may provide limited profile data and may not expose complete experience/projects/posts.

## Index/navbar/sidebar isolation

- This template does **not** use the global navbar/sidebar.
- `.noindex` in this folder is intended to exclude it from SiteUpdater index/sidebar generation.
- `.siteignore` is used to ignore local/private files in this folder for site indexing.

## Local test

```bash
python -m http.server 8000
```

Open:

- `http://localhost:8000/diverse/portfolio-template/`

