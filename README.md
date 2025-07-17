# Nothin1

A minimal static project containing a styled landing page and small script that logs messages automatically on page load.

## Deployment

Deploy this project to any static host such as Vercel, Netlify, or TinyHost.

### Vercel
1. Install the [Vercel CLI](https://vercel.com/docs/cli).
2. Run `vercel` and follow the prompts to link or create a project.
3. Commit and push your changes. Vercel automatically builds and deploys.

### Netlify / TinyHost
For Netlify or TinyHost, simply drop the repository contents into their web interface or use their CLI tools.

The `vercel.json` file rewrites the root path to `index.html` so the landing page serves correctly.

## Login Form and Automation

The page now includes a basic login form that posts to `/api/rentmasseur-login`.
This function proxies credentials to `rentmasseur.com` so you can sign in
without handling CORS yourself. Extend the function in `api/rentmasseur-login.js`
to customize authentication or store credentials in environment variables.

### Bio Optimization

Submit a biography in the "Optimize Bio" form to hit `/api/bio-optimize`, which
forwards the text to a public HuggingFace inference endpoint. The optimized text
appears below the form.

### Booking

The booking form posts to `/api/booking` and logs the request. Extend the
serverless function to persist booking data as needed.

### Visitor Counter

Visits are tracked in `localStorage` and displayed on the page.

### Cron Job

Run `node cron.js` to schedule hourly pings to
`https://rentmasseur.com/karpathianwolf`. Deployers can set up a similar task
using Vercel Cron or another scheduler.
