import axios from "axios";
import * as cheerio from "cheerio";
import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = process.argv[2] ?? "http://ze.lan";
const MAX_DEPTH = parseInt(process.argv[3] ?? "3", 10);
const OUTPUT_FILE = process.argv[4] ?? "scraped-data.json";

interface PageData {
  url: string;
  depth: number;
  title: string;
  texts: string[];
  images: { src: string; alt: string }[];
  links: { href: string; text: string }[];
  error?: string;
}

const visited = new Set<string>();
const results: PageData[] = [];

function normalizeUrl(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);
    url.hash = "";
    if (!url.href.startsWith(BASE_URL)) return null;
    return url.href;
  } catch {
    return null;
  }
}

async function scrapePage(url: string, depth: number): Promise<void> {
  if (visited.has(url) || depth > MAX_DEPTH) return;
  visited.add(url);

  console.log(`[${depth}] Scraping: ${url}`);

  let html: string;
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; scraper/1.0)" },
    });
    html = response.data as string;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ Error: ${message}`);
    results.push({ url, depth, title: "", texts: [], images: [], links: [], error: message });
    return;
  }

  const $ = cheerio.load(html);

  const title = $("title").text().trim();

  const texts: string[] = [];
  $("p, h1, h2, h3, h4, h5, h6, li, td, th, span, div")
    .filter((_, el) => {
      const children = $(el).children().length;
      const text = $(el).clone().children().remove().end().text().trim();
      return children === 0 && text.length > 10;
    })
    .each((_, el) => {
      const text = $(el).text().trim();
      if (text && !texts.includes(text)) texts.push(text);
    });

  const images: { src: string; alt: string }[] = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src") ?? "";
    const alt = $(el).attr("alt") ?? "";
    const absoluteSrc = normalizeUrl(src, url) ?? src;
    if (absoluteSrc) images.push({ src: absoluteSrc, alt });
  });

  const links: { href: string; text: string }[] = [];
  const nextUrls: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const text = $(el).text().trim();
    const absolute = normalizeUrl(href, url);
    if (absolute) {
      links.push({ href: absolute, text });
      if (!visited.has(absolute)) nextUrls.push(absolute);
    } else if (href) {
      links.push({ href, text });
    }
  });

  results.push({ url, depth, title, texts, images, links });

  for (const nextUrl of nextUrls) {
    await scrapePage(nextUrl, depth + 1);
  }
}

async function main() {
  console.log(`\n🕷  Scraper démarré`);
  console.log(`   Site     : ${BASE_URL}`);
  console.log(`   Profondeur: ${MAX_DEPTH}`);
  console.log(`   Sortie   : ${OUTPUT_FILE}\n`);

  await scrapePage(BASE_URL, 0);

  const summary = {
    scrapedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    totalPages: results.length,
    totalImages: results.reduce((acc, p) => acc + p.images.length, 0),
    totalLinks: results.reduce((acc, p) => acc + p.links.length, 0),
    totalTexts: results.reduce((acc, p) => acc + p.texts.length, 0),
    pages: results,
  };

  const outputPath = resolve(OUTPUT_FILE);
  writeFileSync(outputPath, JSON.stringify(summary, null, 2), "utf-8");

  console.log(`\n✅ Terminé !`);
  console.log(`   Pages scrapées : ${summary.totalPages}`);
  console.log(`   Images trouvées: ${summary.totalImages}`);
  console.log(`   Liens trouvés  : ${summary.totalLinks}`);
  console.log(`   Textes extraits: ${summary.totalTexts}`);
  console.log(`   Résultats      : ${outputPath}\n`);
}

main().catch((err) => {
  console.error("Erreur fatale:", err);
  process.exit(1);
});
