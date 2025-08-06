/**
 * Vercel-style handler (req, res)
 */
export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  const { username } = req.body || {};
  console.log(`Login attempt from ${username}`);
  res.status(200).json({ success: true });
}

/**
 * Netlify function signature (event, context)
 */
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }
  const { username } = JSON.parse(event.body || '{}');
  console.log(`Login attempt from ${username}`);
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
}

