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
docker run -d --name fitnessapp -p 8080:8080 <your-dockerhub-username>/simple-fitnessapp:latest
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
docker run -d --name fitnessapp-local -p 8080:8080 simple-fitnessapp:local
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
- Add a deployment step (e.g. to a VPS, Render, Fly.io, or GCP — see below) that pulls
  the new image after it's pushed.

None of this is wired up yet — this file will be updated when it is.

## Deploying to GCP (Cloud Run) — reference for later

This is **not wired into the workflow yet**. It's here so the steps are documented
before we add them, since it needs one-time setup in your GCP account that I can't do
for you (creating a project, enabling billing, granting IAM roles).

**Why Cloud Run**: the app is already a container, and Cloud Run runs a container
directly, scales to zero (so it costs ~nothing at low traffic), and gives you a public
HTTPS URL with no server to manage. This fits a static nginx container much better
than a VM.

### 1. One-time GCP setup (do this yourself in the GCP Console or `gcloud`)

```bash
# Install gcloud CLI first: https://cloud.google.com/sdk/docs/install

# Log in and pick/create a project
gcloud auth login
gcloud projects create simple-fitnessapp-prod   # or use an existing project
gcloud config set project simple-fitnessapp-prod

# Enable the APIs the pipeline will need
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iamcredentials.googleapis.com

# Create an Artifact Registry repo to hold the image
gcloud artifacts repositories create simple-fitnessapp \
  --repository-format=docker \
  --location=us-central1
```

### 2. Let GitHub Actions authenticate to GCP without a long-lived key

Google's recommended approach is **Workload Identity Federation (WIF)** — GitHub
Actions proves its identity to GCP per-run, so there's no service-account JSON key
sitting in your GitHub secrets to leak. Set it up once:

```bash
# Create a service account for deployments
gcloud iam service-accounts create github-deployer \
  --display-name="GitHub Actions deployer"

# Grant it just what it needs: push images and deploy to Cloud Run
gcloud projects add-iam-policy-binding simple-fitnessapp-prod \
  --member="serviceAccount:github-deployer@simple-fitnessapp-prod.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding simple-fitnessapp-prod \
  --member="serviceAccount:github-deployer@simple-fitnessapp-prod.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding simple-fitnessapp-prod \
  --member="serviceAccount:github-deployer@simple-fitnessapp-prod.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Create a Workload Identity Pool + Provider trusted for this GitHub repo only
gcloud iam workload-identity-pools create "github-pool" \
  --location="global" --display-name="GitHub Actions pool"

gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='Muhammad-Ali500/simple-fitnessapp'" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Allow that provider to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding \
  github-deployer@simple-fitnessapp-prod.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/Muhammad-Ali500/simple-fitnessapp"
```

(Replace `PROJECT_NUMBER` with your numeric GCP project number, from
`gcloud projects describe simple-fitnessapp-prod --format="value(projectNumber)"`.)

### 3. GitHub secrets this will need

| Secret | Value |
|---|---|
| `GCP_PROJECT_ID` | `simple-fitnessapp-prod` (or whatever you named it) |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Full resource name of the provider from step 2, e.g. `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `GCP_SERVICE_ACCOUNT` | `github-deployer@simple-fitnessapp-prod.iam.gserviceaccount.com` |

No secret key file needed — that's the point of WIF.

*(Simpler but less secure alternative: skip WIF, create a JSON key with
`gcloud iam service-accounts keys create`, and store its contents as a single
`GCP_SA_KEY` secret. Works fine for a small project, but the key never expires unless
you rotate it manually, so WIF is the safer default.)*

### 4. The workflow job we'll add later

Once the above is done, this job gets appended to `.github/workflows/ci-cd.yml`
(after the existing `docker` job, or replacing it if we drop Docker Hub in favor of
GCP entirely):

```yaml
  deploy-gcp:
    name: Deploy to Cloud Run
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write   # required for Workload Identity Federation
    steps:
      - uses: actions/checkout@v4

      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}

      - uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker for Artifact Registry
        run: gcloud auth configure-docker us-central1-docker.pkg.dev

      - name: Build and push image
        run: |
          IMAGE=us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/simple-fitnessapp/app:${{ github.sha }}
          docker build -t "$IMAGE" .
          docker push "$IMAGE"
          echo "IMAGE=$IMAGE" >> "$GITHUB_ENV"

      - name: Deploy to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: simple-fitnessapp
          region: us-central1
          image: ${{ env.IMAGE }}
          flags: --allow-unauthenticated
```

After this runs, `gcloud run services describe simple-fitnessapp --region=us-central1
--format="value(status.url)"` gives you the public HTTPS URL Cloud Run assigned.

### 5. Testing it yourself before wiring up CI

You can deploy manually first to confirm the app runs correctly on Cloud Run before
any of this is automated:

```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
docker build -t us-central1-docker.pkg.dev/simple-fitnessapp-prod/simple-fitnessapp/app:manual .
docker push us-central1-docker.pkg.dev/simple-fitnessapp-prod/simple-fitnessapp/app:manual
gcloud run deploy simple-fitnessapp \
  --image us-central1-docker.pkg.dev/simple-fitnessapp-prod/simple-fitnessapp/app:manual \
  --region us-central1 \
  --allow-unauthenticated
```

`gcloud` prints the live URL when this finishes — open it to confirm the calculators
work in production before we automate the deploy step in CI.

## Alternative: setting up CI/CD entirely in the GCP Console (no GitHub Actions)

Everything above wires GitHub Actions to GCP. GCP also has its own built-in way to
watch a GitHub repo and auto-build/auto-deploy on every push, configured entirely
through the **Cloud Run console** — no workflow YAML, no secrets to manage on the
GitHub side. Under the hood it creates a **Cloud Build trigger** for you.

**Trade-off vs. the GitHub Actions approach**: this is faster to set up and needs zero
GitHub secrets, but it deploys on every push to `main` regardless of whether
`node test.js` passes — Cloud Build doesn't know about the `test` job in
`ci-cd.yml`. If you want deploys blocked on tests passing, use the GitHub Actions
route above instead. You can also run both: keep GitHub Actions for the `test` job as
a PR gate, and use this for deployment — just know the two aren't linked, so a broken
`main` could still get deployed via this path.

### Steps

1. Go to the Cloud Run console: https://console.cloud.google.com/run
   Make sure the correct project is selected in the project picker at the top.

2. Click **Create service**.

3. Select **Continuously deploy from a repository (source or function)**, then click
   **Set up with Cloud Build**.

4. Under **Repository provider**, choose **GitHub**, then click **Authenticate**.
   - A popup asks you to install/authorize the **Google Cloud Build** GitHub App.
   - Grant it access to `Muhammad-Ali500/simple-fitnessapp` (either just this repo, or
     all repos — this repo only is the safer choice).

5. Back in the console, select the repository `Muhammad-Ali500/simple-fitnessapp` from
   the dropdown, then click **Next**.

6. Configure the build:
   - **Branch**: `^main$` (this is a regex — it means "only the `main` branch")
   - **Build type**: choose **Dockerfile**
   - **Source location**: `/Dockerfile` (the default, since it's at the repo root)
   - Click **Save**.

7. Configure the service itself (same screen, below the build config):
   - **Service name**: `simple-fitnessapp`
   - **Region**: pick one close to you, e.g. `us-central1`
   - **Authentication**: select **Allow unauthenticated invocations** (this is a
     public site, not an API)
   - **Container port**: leave this at the default `8080` — `nginx.conf` in this repo
     listens on `0.0.0.0:8080`, which matches what Cloud Run expects out of the box,
     so no override is needed.
   - CPU/memory defaults are fine for a static site — no need to change them.

8. Click **Create**.

   GCP now creates the Cloud Build trigger and kicks off the first build immediately.
   You can watch it under **Cloud Build → History** in the console, or from the
   service's **Build History** tab in Cloud Run.

9. When the first build finishes, the Cloud Run console shows a URL like:
   `https://simple-fitnessapp-xxxxxxxxxx-uc.a.run.app`
   Open it to confirm the calculators work.

10. From now on, **every push to `main` automatically triggers a new build and
    deploy** — that's the CI/CD, fully configured through the console. Nothing else
    to do.

### Where to check on it later

- **Build history / logs**: Cloud Build console → History, or Cloud Run service →
  **Build History** tab — shows every build triggered by a push, pass or fail.
- **Live traffic / revisions**: Cloud Run service → **Revisions** tab — shows each
  deployed version and lets you roll back to a previous revision if a bad push goes
  out.
- **Runtime logs**: Cloud Run service → **Logs** tab.
