export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  const { username, password } = req.body || {};
  try {
    const upstream = await fetch('https://rentmasseur.com/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const text = await upstream.text();
    res.status(upstream.status).send(text);
  } catch (err) {
    console.error('Proxy error', err);
    res.status(500).json({ error: 'Login proxy failed' });
  }
}
