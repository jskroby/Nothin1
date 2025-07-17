import cron from 'node-cron';
const url = 'https://rentmasseur.com/karpathianwolf';
cron.schedule('0 * * * *', async () => {
  try {
    const res = await fetch(url);
    console.log('Visited rentmasseur page', res.status);
  } catch (err) {
    console.error('Error visiting page', err);
  }
});
console.log('Cron job scheduled to visit', url, 'every hour');

