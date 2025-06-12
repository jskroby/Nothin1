export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  const { username } = req.body || {};
  console.log(`Login attempt from ${username}`);
  res.status(200).json({ success: true });
}
