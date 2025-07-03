# Personal Website

This is my personal website built with Next.js and deployed using GitHub Pages!!! I plan to properly update it a bit further, but as of right now it's basically a copy and paste from the basic HTML/CSS before.

## Deployment

This website is automatically deployed to GitHub Pages using GitHub Actions. The deployment process is configured in `.github/workflows/nextjs.yml` and follows these steps:

1. **Trigger**: The workflow runs on:
   - Push to the `main` branch
   - Manual trigger from the Actions tab

2. **Build Process**:
   - Uses Node.js 20
   - Detects package manager (npm/yarn)
   - Installs dependencies
   - Builds the Next.js application
   - Uploads the build artifact

3. **Deployment**:
   - Automatically deploys to GitHub Pages
   - Uses the `github-pages` environment
   - Provides a public URL for the deployed site

## Local Development

To run this project locally (dev):

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

To run the production version locally you must remove the `output: export` in the `next.config.js` file, then run:

```bash
# Install dependencies
npm install

# Build the site
npm run build

# Start the production server
npm start
```

## Technologies Used

- Next.js
- React
- TypeScript
- TailwindCSS
- ESLint

## Project Structure

- `.github/workflows/nextjs.yml` - GitHub Actions workflow configuration
- `package.json` - Project dependencies and scripts
- `src/` - Source code directory
- `public/` - Static assets
