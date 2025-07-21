const fs = require('fs');
const path = './main.js';
try {
  const content = fs.readFileSync(path, 'utf8');
  if (!content.includes('autoBio') || !content.includes('autoBlog')) {
    throw new Error('Required functions not found');
  }
  console.log('Script check passed.');
} catch (err) {
  console.error('Script check failed:', err.message);
  process.exit(1);
}
