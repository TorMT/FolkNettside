# Matprissøk

Matprissøk bruker en lokal PHP-proxy mot Kassalapp.

Sett nøkkelen server-side i prosjektets lokale `.env`-fil:

```env
KASSALAPP_API_KEY=<KASSALAPP_API_KEY>
```

Nøkkelen skal aldri legges i HTML eller JavaScript. Proxyen bruker fem minutters søkecache og femten minutters EAN-cache.
