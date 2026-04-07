# APS/Fusion API – sikkerhet og tilgang

Kort svar: **nei, API-nøkler skal ikke i repo**.

## Hva som er trygt å publisere

- Frontend/design (HTML/CSS/JS UI)
- Dokumentasjon og arkitektur
- Eksempel-filer med placeholders

## Hva som aldri skal pushes

- `APS_CLIENT_SECRET`
- OAuth refresh/access tokens
- Private callback-URLs med hemmelig query state

## Anbefalt oppsett

1. Legg secrets i miljøvariabler på server/CI:
   - `APS_CLIENT_ID`
   - `APS_CLIENT_SECRET`
   - `APS_CALLBACK_URL`
2. Hold OAuth/token-logikk i backend.
3. Frontend får kun kortlivet access token (eller proxiede API-kall).
4. Bruk minst mulig scopes (prinsipp om minste privilegium).

## “Kan de bare se designet og ikke endre?”

Ja. Det får du ved å bruke **read-only scopes** og/eller brukerroller uten skrive-tilgang.

Eksempel-prinsipp:
- “View only” = lesetilgang (`data:read`) uten `data:write`.
- Endring krever eksplisitt skrive-scope + rolle som har write i Autodesk-prosjektet.

## Eksempel local env (ikke commit)

Lag en lokal fil som **ikke** pushes (f.eks. `.env.local`):

```bash
APS_CLIENT_ID=your_client_id
APS_CLIENT_SECRET=your_client_secret
APS_CALLBACK_URL=http://localhost:3000/auth/callback
```

## VS Code: hvor du legger nøkkel lokalt (uten sync til git)

1. Opprett en lokal fil i prosjektroten:
   - `.env.local` (den blir ignorert av `.gitignore` via `.env.*`).
2. Legg inn nøkler der:

```bash
APS_CLIENT_ID=din_client_id
APS_CLIENT_SECRET=din_client_secret
APS_CALLBACK_URL=http://localhost:3000/auth/callback
```

3. Hvis du kjører fra VS Code debugger:
   - kopier `.vscode/launch.example.json` til `.vscode/launch.json`
   - behold `envFile: ${workspaceFolder}/.env.local`

`/.vscode/launch.json` og `/.vscode/settings.json` er ignorert, så de blir ikke pushet.
