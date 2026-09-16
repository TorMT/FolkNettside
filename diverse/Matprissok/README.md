# Matprissøk

Matprissøk bruker en lokal PHP-proxy mot Kassalapp.

Kjør alltid siden via PHP, ikke med Python static server:

```bash
cd /sti/til/prosjektet
php -S 127.0.0.1:8000
```

Så åpner du:

- http://127.0.0.1:8000/diverse/Matprissok/index.html
- eller http://127.0.0.1:8000/diverse/Matprissok/inview.html

Sett nøkkelen server-side i prosjektets lokale `.env`-fil:

```env
KASSALAPP_API_KEY=<KASSALAPP_API_KEY>
```

Nøkkelen skal aldri legges i HTML eller JavaScript. Proxyen bruker fem minutters søkecache og femten minutters EAN-cache.
