# Nothin1

A minimal static project containing a styled landing page and small script that logs messages automatically on page load.

## Deployment

Deploy this project to a variety of hosts including Vercel, Netlify, Hugging Face Spaces or Replit.

### Vercel
1. Install the [Vercel CLI](https://vercel.com/docs/cli).
2. Run `vercel` and follow the prompts to link or create a project.
3. Commit and push your changes. Vercel automatically builds and deploys.

### Netlify
The included `netlify.toml` config publishes the project root and maps
serverless functions in `/api`. Deploy via the Netlify UI or by installing
the [Netlify CLI](https://docs.netlify.com/cli/get-started/).

### Hugging Face Spaces
The `.huggingface/spaces.json` marks this repository as a static Space.
Push the repo to a new Space and it will serve the `index.html` file.

### Replit
The `.replit` and `replit.nix` files start a small Express server defined in
`server.js`. Run the repl and your project will be served on the provided URL.

The `vercel.json` file rewrites the root path to `index.html` so the landing page serves correctly.

## Login Form

The page now includes a basic login form that posts to `/api/login`. You can
extend the serverless function in `api/login.js` to authenticate users or store
credentials in environment variables.

## Fartcoin

This project is ready to be the launchpad for **Fartcoin**—aim high and send it
to the moon. 🚀
