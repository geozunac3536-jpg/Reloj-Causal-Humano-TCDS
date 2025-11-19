export default async function handler(req, res) {
  const apiKey = process.env.AI_GATEWAY_API_KEY;

  if (!apiKey) return res.status(500).json({ error: "API key missing" });

  const { messages } = req.body;

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages
    }),
  });

  const data = await upstream.json();
  return res.status(200).json(data);
}
