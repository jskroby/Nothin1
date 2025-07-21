# Nothin1

A minimal static project containing a styled landing page and small script that logs messages automatically on page load.

## Deployment

Deploy this project to any static host such as Vercel, Netlify, or TinyHost.  
You can also quickly spin up a Replit workspace or Hugging Face Space.

### One-click Deploy

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https://github.com/your-username/Nothin1)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/your-username/Nothin1)
[![Run on Replit](https://repl.it/badge/github/your-username/Nothin1)](https://repl.it/github/your-username/Nothin1)
[![Deploy on Hugging Face](https://img.shields.io/badge/Deploy%20to-Hugging%20Face-blue)](https://huggingface.co/spaces/your-username/Nothin1)

### Vercel
1. Install the [Vercel CLI](https://vercel.com/docs/cli).
2. Run `vercel` and follow the prompts to link or create a project.
3. Commit and push your changes. Vercel automatically builds and deploys.

### Netlify / TinyHost
For Netlify or TinyHost, simply drop the repository contents into their web interface or use their CLI tools.

### Replit
Click the "Run on Replit" button above or go to [Replit](https://replit.com/) and import the repository. Replit will install dependencies automatically and serve the site.

### Hugging Face
You can also deploy this static site as a [Hugging Face Space](https://huggingface.co/spaces). Use the "Deploy on Hugging Face" button to create a new Space backed by this repository.

The `vercel.json` file rewrites the root path to `index.html` so the landing page serves correctly.

## Login Form

The page now includes a basic login form that posts to `/api/login`. You can
extend the serverless function in `api/login.js` to authenticate users or store
credentials in environment variables.
