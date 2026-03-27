export default async function handler(req, res) {
  const login = String(req.query?.user || '').trim();
  if (!login) return res.status(400).json({ error: 'Missing user parameter' });

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(200).json({ pronouns: null });

  try {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `bearer ${token}`
      },
      body: JSON.stringify({
        query: 'query($login:String!) { user(login:$login) { pronouns } }',
        variables: { login }
      })
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'GitHub API error' });
    }

    const data = await response.json();
    const pronouns = data?.data?.user?.pronouns || null;
    return res.status(200).json({ pronouns });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
