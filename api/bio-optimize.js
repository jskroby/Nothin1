export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  const { bio } = req.body || {};
  if (!bio) {
    res.status(400).json({ error: 'Missing bio' });
    return;
  }
  try {
    const hf = await fetch('https://api-inference.huggingface.co/models/gpt2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: bio })
    });
    const data = await hf.json();
    const optimizedBio = Array.isArray(data) && data[0]?.generated_text ? data[0].generated_text : '';
    res.status(200).json({ optimizedBio });
  } catch (err) {
    console.error('HF error', err);
    res.status(500).json({ error: 'HF request failed' });
  }
}
