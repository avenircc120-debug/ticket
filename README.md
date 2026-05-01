# Ticket - Scraper ze.lan

Script Node.js pour scraper le site http://ze.lan et extraire textes, images et liens.

## Installation

```bash
pnpm install
```

## Utilisation

```bash
# Par défaut (http://ze.lan, profondeur 3)
npx tsx src/scraper.ts

# Personnalisé
npx tsx src/scraper.ts http://ze.lan 5 resultats.json
```

## Résultat

Un fichier JSON contenant pour chaque page :
- **title** : titre de la page
- **texts** : tous les textes extraits
- **images** : URLs et attributs alt des images
- **links** : tous les liens internes avec leur texte

