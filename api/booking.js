export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  const { name, time } = req.body || {};
  if (!name || !time) {
    res.status(400).json({ error: 'Missing fields' });
    return;
  }
  console.log('Received booking', { name, time });
  res.status(200).json({ ok: true });
}
