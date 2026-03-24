export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'No prompt provided' });
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: 'You write recruiter briefs. Output plain text only. No markdown, no bullet points, no headings, no code, and never use em dashes. Keep exactly 3 sentences. If gender is not explicitly stated or certain, default to they/them.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!response.ok) throw new Error('Anthropic API error');
    const data = await response.json();
    return res.status(200).json({ summary: data.content?.[0]?.text || null });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
