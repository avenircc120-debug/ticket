const GITHUB_REPO = 'avenircc120-debug/ticket';
const GITHUB_FILE = 'wifi-codes.json';
const GITHUB_BRANCH = 'main';

async function githubRequest(method, path, body) {
  const token = process.env.GITHUB_ACCESS_TOKEN;
  const bodyStr = body ? JSON.stringify(body) : undefined;
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    ...(bodyStr ? { body: bodyStr } : {}),
  });
  return res.json();
}

async function readCodes() {
  const data = await githubRequest('GET', `contents/${GITHUB_FILE}?ref=${GITHUB_BRANCH}`, null);
  if (data.content) {
    return JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
  }
  return { codes: [], used: [] };
}

async function writeCodes(store, sha) {
  const content = Buffer.from(JSON.stringify(store, null, 2)).toString('base64');
  await githubRequest('PUT', `contents/${GITHUB_FILE}`, {
    message: 'update: wifi codes',
    content,
    branch: GITHUB_BRANCH,
    ...(sha ? { sha } : {}),
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  /* GET — retourne le prochain code disponible */
  if (req.method === 'GET') {
    try {
      const data = await githubRequest('GET', `contents/${GITHUB_FILE}?ref=${GITHUB_BRANCH}`, null);
      if (!data.content) return res.status(404).json({ error: 'Aucun code WiFi chargé' });
      const store = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
      const available = store.codes.filter(c => !store.used.includes(c));
      if (!available.length) return res.status(410).json({ error: 'Plus de codes disponibles' });
      const code = available[0];
      store.used.push(code);
      await writeCodes(store, data.sha);
      return res.status(200).json({ code, remaining: available.length - 1 });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  /* POST — enregistre une liste de codes envoyée par le scraper */
  if (req.method === 'POST') {
    const secret = req.headers['x-scraper-secret'];
    if (secret !== process.env.SCRAPER_SECRET) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    const { codes } = req.body || {};
    if (!Array.isArray(codes) || !codes.length) {
      return res.status(400).json({ error: 'Tableau "codes" requis' });
    }
    try {
      const existing = await githubRequest('GET', `contents/${GITHUB_FILE}?ref=${GITHUB_BRANCH}`, null);
      const sha = existing.sha;
      let store = { codes: [], used: [] };
      if (existing.content) {
        store = JSON.parse(Buffer.from(existing.content, 'base64').toString('utf8'));
      }
      const newCodes = codes.filter(c => !store.codes.includes(c));
      store.codes = [...store.codes, ...newCodes];
      await writeCodes(store, sha);
      return res.status(200).json({ added: newCodes.length, total: store.codes.length });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
