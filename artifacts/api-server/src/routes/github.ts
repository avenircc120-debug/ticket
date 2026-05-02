import { Router, type IRouter } from "express";

const router: IRouter = Router();

const GITHUB_REPO = "avenircc120-debug/ticket";
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/issues`;

router.post("/github/issues", async (req, res) => {
  const token = process.env["GITHUB_ACCESS_TOKEN"];

  if (!token) {
    res.status(500).json({ error: "GITHUB_ACCESS_TOKEN non configuré" });
    return;
  }

  const { title, body, label } = req.body as {
    title?: string;
    body?: string;
    label?: string;
  };

  if (!title || title.trim() === "") {
    res.status(400).json({ error: "Le titre est obligatoire" });
    return;
  }

  try {
    const payload: Record<string, unknown> = {
      title: title.trim(),
      body: body?.trim() ?? "",
    };

    if (label && label.trim() !== "") {
      payload.labels = [label.trim()];
    }

    const response = await fetch(GITHUB_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      req.log.error({ status: response.status, data }, "GitHub API error");
      res.status(response.status).json({
        error: (data.message as string) ?? "Erreur GitHub",
      });
      return;
    }

    res.status(201).json({
      id: data.number,
      title: data.title,
      url: data.html_url,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create GitHub issue");
    res.status(500).json({ error: "Erreur lors de la création du ticket" });
  }
});

export default router;
