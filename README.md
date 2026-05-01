# Ticket Wi-Fi

Page secrète de génération de tickets Wi-Fi. Déployée sur Vercel.

## Variables denvironnement requises

| Variable | Description |
|---|---|
| `TICKET_SECRET` | Token secret pour lURL de la page |
| `WIFI_URL` | URL du système Wi-Fi qui génère les tickets |

## URL daccès

Une fois déployé sur Vercel, accédez à :

```
https://votre-app.vercel.app/t/VOTRE_TICKET_SECRET
```

## Déploiement Vercel

1. Importer ce dépôt sur [vercel.com/new](https://vercel.com/new)
2. Ajouter les variables denvironnement `TICKET_SECRET` et `WIFI_URL`
3. Déployer

