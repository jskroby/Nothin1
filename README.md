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

## Login Form

The page now includes a basic login form that posts to `/api/login`. You can
extend the serverless function in `api/login.js` to authenticate users or store
credentials in environment variables.
