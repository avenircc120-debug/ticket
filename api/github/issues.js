module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.GITHUB_ACCESS_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "GITHUB_ACCESS_TOKEN non configuré" });
  }

  const { title, body, label } = req.body || {};

  if (!title || String(title).trim() === "") {
    return res.status(400).json({ error: "Le titre est obligatoire" });
  }

  const payload = {
    title: String(title).trim(),
    body: String(body || "").trim(),
  };

  if (label && String(label).trim() !== "") {
    payload.labels = [String(label).trim()];
  }

  try {
    const response = await fetch(
      "https://api.github.com/repos/avenircc120-debug/ticket/issues",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || "Erreur GitHub" });
    }

    return res.status(201).json({
      id: data.number,
      title: data.title,
      url: data.html_url,
    });
  } catch (err) {
    return res.status(500).json({ error: "Erreur lors de la création du ticket" });
  }
};
