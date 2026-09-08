# CI/CD Setup Guide

This repo has a minimal GitHub Actions pipeline in `.github/workflows/ci-cd.yml`.
It does exactly two things, in order:

1. **`test` job** — runs `node test.js` against every push and pull request to `main`.
2. **`docker` job** — only runs on a push to `main` (not on pull requests), and only if
   `test` passed. It builds the image from the `Dockerfile` and pushes it to Docker Hub
   as `<your-dockerhub-username>/simple-fitnessapp:latest`.

Nothing else — no smoke tests, no GitHub Pages, no multi-arch builds, no SHA tagging.
We'll layer that in later once this baseline is solid.

## One-time setup: connect Docker Hub

The workflow needs two GitHub Actions secrets so it can log in to Docker Hub and push
the image. You only have to do this once per repo.

### 1. Create a Docker Hub access token

1. Log in at https://hub.docker.com
2. Click your avatar (top right) → **Account Settings** → **Security** →
   **Personal access tokens**
3. Click **Generate new token**
   - Description: e.g. `simple-fitnessapp-github-actions`
   - Permissions: **Read & Write** (needed to push images)
4. Click **Generate** and **copy the token immediately** — Docker Hub only shows it once.

### 2. Create the Docker Hub repository

1. On Docker Hub, click **Create Repository**
2. Name: `simple-fitnessapp`
3. Visibility: your choice (Public is fine for this project)
4. Click **Create**

### 3. Add the secrets to your GitHub repo

1. Go to `https://github.com/Muhammad-Ali500/simple-fitnessapp/settings/secrets/actions`
2. Click **New repository secret** and add:
   - Name: `DOCKERHUB_USERNAME` → Value: your Docker Hub username
3. Click **New repository secret** again and add:
   - Name: `DOCKERHUB_TOKEN` → Value: the access token you copied in step 1

That's it. No other configuration is needed.

## How it runs

- **Push to `main`**: both jobs run. If tests pass, the image is built and pushed to
  Docker Hub as `latest`.
- **Pull request into `main`**: only the `test` job runs. Nothing is built or pushed,
  so PRs can't accidentally publish an image.
- **Push to any other branch**: nothing runs — the workflow only triggers on `main`.

You can watch runs at:
`https://github.com/Muhammad-Ali500/simple-fitnessapp/actions`

## Verifying the image was pushed

After a push to `main` completes successfully, check:
`https://hub.docker.com/r/<your-dockerhub-username>/simple-fitnessapp/tags`

You should see a `latest` tag with a recent timestamp.

## Running the published image locally

Once it's on Docker Hub, anyone can pull and run it without cloning the repo:

```bash
docker pull <your-dockerhub-username>/simple-fitnessapp:latest
docker run -d --name fitnessapp -p 8080:80 <your-dockerhub-username>/simple-fitnessapp:latest
```

Then open http://localhost:8080

Stop it with:

```bash
docker stop fitnessapp && docker rm fitnessapp
```

## Testing everything locally before you push (what this pipeline mirrors)

```bash
# 1. Run the calculator math tests
node test.js

# 2. Build the image
docker build -t simple-fitnessapp:local .

# 3. Run it and check it in a browser
docker run -d --name fitnessapp-local -p 8080:80 simple-fitnessapp:local
# open http://localhost:8080

# 4. Clean up
docker stop fitnessapp-local && docker rm fitnessapp-local
```

If both of these succeed locally, the GitHub Actions pipeline will succeed too — it
runs the same two steps.

## Planned next steps (not done yet, on purpose)

- Tag images with the git commit SHA in addition to `latest`, so you can roll back.
- Add the container smoke-test step back in before pushing to Docker Hub.
- Cache Docker layers in CI to speed up builds.
- Add a deployment step (e.g. to a VPS, Render, or Fly.io) that pulls the new image
  after it's pushed.

None of this is wired up yet — this file will be updated when it is.
