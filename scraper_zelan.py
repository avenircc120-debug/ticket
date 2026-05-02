#!/usr/bin/env python3
"""
Scraper ze.lan → Vercel API
Lancez ce script quand votre appareil est connecté au réseau ze.lan.
"""

import requests
import json
import re
from bs4 import BeautifulSoup

# ─── CONFIGURATION ───────────────────────────────────────────────
VERCEL_API   = "https://ticket-tau-seven.vercel.app/api/wifi/codes"
SCRAPER_SECRET = "l8oobq7ulgi4ky9rkga8m"   # Votre secret

ZELAN_BASE   = "http://ze.lan"              # Domaine local ze.lan
# Pages à essayer (ajustez selon ce que vous voyez sur ze.lan)
PAGES_TO_TRY = [
    "/",
    "/wifi",
    "/acces",
    "/internet",
    "/codes",
    "/password",
    "/connect",
    "/network",
]
# ─────────────────────────────────────────────────────────────────


def scrape_page(url):
    """Récupère une page et cherche des codes WiFi dedans."""
    try:
        r = requests.get(url, timeout=5, verify=False)
        r.raise_for_status()
        return r.text
    except Exception as e:
        print(f"  ✗ {url} — {e}")
        return None


def extract_codes(html):
    """
    Cherche des codes WiFi dans le HTML.
    Adaptez les patterns selon ce que vous voyez sur ze.lan.
    """
    codes = set()
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(" ")

    # Pattern 1 : mots de passe WiFi typiques (8–20 chars alphanumériques)
    matches = re.findall(r'\b([A-Za-z0-9!@#$%^&*\-_]{8,20})\b', text)
    for m in matches:
        # Filtrer pour garder seulement les codes qui ressemblent à des passwords
        if re.search(r'[0-9]', m) and re.search(r'[A-Za-z]', m):
            codes.add(m)

    # Pattern 2 : balises input ou data- qui contiennent "wifi", "password", "code"
    for tag in soup.find_all(True):
        for attr in ['value', 'data-code', 'data-password', 'data-wifi', 'placeholder']:
            val = tag.get(attr, '')
            if val and len(val) >= 6:
                codes.add(val.strip())

    # Pattern 3 : chercher dans les balises <code>, <pre>, <span class="code">
    for tag in soup.find_all(['code', 'pre']):
        val = tag.get_text().strip()
        if 4 <= len(val) <= 30:
            codes.add(val)

    return list(codes)


def send_to_vercel(codes):
    """Envoie les codes à votre API Vercel."""
    print(f"\n📡 Envoi de {len(codes)} code(s) à Vercel…")
    try:
        r = requests.post(
            VERCEL_API,
            headers={
                "Content-Type": "application/json",
                "x-scraper-secret": SCRAPER_SECRET,
            },
            json={"codes": codes},
            timeout=10,
        )
        data = r.json()
        if r.ok:
            print(f"✅ {data.get('added', 0)} nouveaux codes ajoutés | Total : {data.get('total', '?')}")
        else:
            print(f"❌ Erreur API : {data}")
    except Exception as e:
        print(f"❌ Connexion Vercel échouée : {e}")


def main():
    print("=" * 50)
    print("  SCRAPER ze.lan → Vercel")
    print("=" * 50)
    print(f"Cible : {ZELAN_BASE}\n")

    all_codes = []

    for page in PAGES_TO_TRY:
        url = ZELAN_BASE + page
        print(f"→ Scraping {url}")
        html = scrape_page(url)
        if html:
            codes = extract_codes(html)
            if codes:
                print(f"  ✓ {len(codes)} code(s) trouvé(s) : {codes[:3]}{'…' if len(codes)>3 else ''}")
                all_codes.extend(codes)
            else:
                print(f"  · Aucun code trouvé sur cette page")

    # Dédoublonner
    all_codes = list(set(all_codes))
    print(f"\n📋 Total unique : {len(all_codes)} code(s)")

    if not all_codes:
        print("\n⚠️  Aucun code trouvé automatiquement.")
        print("Essayez d'ouvrir ze.lan dans votre navigateur et copiez l'URL exacte.")
        manual = input("Entrez manuellement des codes séparés par des virgules (ou Entrée pour passer) : ").strip()
        if manual:
            all_codes = [c.strip() for c in manual.split(",") if c.strip()]

    if all_codes:
        print("\nCodes à envoyer :")
        for c in all_codes:
            print(f"  • {c}")
        confirm = input("\nEnvoyer ces codes à Vercel ? (o/n) : ").strip().lower()
        if confirm == 'o':
            send_to_vercel(all_codes)
        else:
            print("Annulé.")
    else:
        print("Rien à envoyer.")


if __name__ == "__main__":
    main()
