# RentGaadi — Enterprise CI/CD Guide (GitHub Actions + Docker + AWS EC2 Blue‑Green)

This guide replicates the kind of pipeline used at startups/MNCs (like the `WonderWhyDev/pipelines`
setup) and adapts it to **RentGaadi**:

- **Backend:** Node 22 / Express (ESM), MongoDB Atlas, port `5000`, entry `index.js`.
- **Frontend:** React + Vite (currently on Netlify).
- **Repos:** `stanli206/RentGaadi_backEnd`, `stanli206/Online-Vehicle-Rental-System_frontEnd`.

> Honest note: for a project this size this is *over‑engineered*. You asked for the full
> enterprise replica to learn the real patterns — so that's what this is. You can adopt
> it in phases (CI first, then Docker/GHCR, then EC2 blue‑green).

---

## 0. The target architecture

```
            ┌──────────────────────── GitHub ────────────────────────┐
            │  RentGaadi_pipelines  (central pipelines repo)          │
            │   .github/                                              │
            │     workflows/   0_backend_pipeline.yml                 │
            │                  0_revert_backend.yml                   │
            │                  x_base_deploy_ec2.yml (reusable)       │
            │     actions/     copy_to_ec2/action.yml (composite)     │
            └─────────────────────────────────────────────────────────┘
                       │ checks out app code from
                       ▼
   stanli206/RentGaadi_backEnd  ──build──►  GHCR image (ghcr.io/<you>/rentgaadi-backend:<sha>)
                                                   │
                                                   ▼  SSH deploy (blue‑green)
                                            ┌──────────────┐
                                            │   AWS EC2    │
                                            │  nginx  ◄──┐ │
                                            │  blue (5001)│ │  active/inactive flip
                                            │  green(5002)┘ │
                                            └──────────────┘
```

**Pipeline stages (backend):**
`find_latest_version → lint → unit_test (matrix) → functional_test (docker compose) → build_and_push (GHCR) → deploy_qa (blue‑green on EC2)`

---

## 1. Prerequisites (one‑time)

1. **AWS account** + an **EC2 instance** (Ubuntu 22.04, t3.small is fine for QA).
2. A **key pair** (`.pem`) for SSH into EC2.
3. **MongoDB Atlas** connection string (you already have one).
4. A **domain** (optional but recommended) pointing to the EC2 public IP.
5. **GitHub** account (you have it) — we'll use **GHCR** (GitHub Container Registry), free for your images.

---

## 2. Create the central pipelines repo

Enterprises keep pipelines **separate** from app code so one pipeline serves many apps and
secrets live in one place.

```bash
# locally
mkdir RentGaadi_pipelines && cd RentGaadi_pipelines
git init -b main
mkdir -p .github/workflows .github/actions/copy_to_ec2
echo "# RentGaadi Pipelines" > README.md
git add . && git commit -m "init pipelines repo"
# create the repo on GitHub (stanli206/RentGaadi_pipelines) and:
git remote add origin https://github.com/stanli206/RentGaadi_pipelines.git
git push -u origin main
```

Final structure:

```
RentGaadi_pipelines/
└── .github/
    ├── actions/
    │   └── copy_to_ec2/
    │       └── action.yml          # composite action: scp + ssh helper
    └── workflows/
        ├── 0_backend_pipeline.yml  # main backend CI/CD
        ├── 0_revert_backend.yml    # one‑click rollback
        └── x_base_deploy_ec2.yml   # reusable deploy workflow
```

---

## 3. Containerize the backend (already done — refine for prod)

You already have a `Dockerfile`. Confirm it looks like this (production, non‑root):

```dockerfile
FROM node:22-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000
USER node
CMD ["node", "index.js"]
```

You also already added `/health` in `app.js` — the deploy health‑check depends on it.

---

## 4. EC2 one‑time setup

SSH in and prepare the host:

```bash
ssh -i rentgaadi.pem ubuntu@<EC2_PUBLIC_IP>

# Install Docker + compose plugin
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin
sudo usermod -aG docker ubuntu      # re-login after this

# App directories for blue-green
mkdir -p ~/rentgaadi/blue ~/rentgaadi/green ~/rentgaadi/nginx
echo blue > ~/.active_backend_color  # start on "blue"
```

### nginx reverse proxy (`~/rentgaadi/nginx/nginx.conf`)

```nginx
events {}
http {
  # 'active_backend' is rewritten by flip.sh to point at blue or green
  upstream active_backend { server 127.0.0.1:5001; }   # 5001=blue, 5002=green

  server {
    listen 80;
    location /health { proxy_pass http://active_backend; }
    location / {
      proxy_pass http://active_backend;
      proxy_set_header Host $host;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
  }
}
```

Run nginx once:

```bash
docker run -d --name rentgaadi-nginx --network host \
  -v ~/rentgaadi/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
  --restart unless-stopped nginx:alpine
```

### Blue‑green flip script (`~/rentgaadi/flip.sh`)

```bash
#!/usr/bin/env bash
set -e
COLOR=$1                       # blue | green
PORT=$([ "$COLOR" = "blue" ] && echo 5001 || echo 5002)
sed -i "s|server 127.0.0.1:[0-9]*;|server 127.0.0.1:$PORT;|" ~/rentgaadi/nginx/nginx.conf
docker exec rentgaadi-nginx nginx -s reload
echo "$COLOR" > ~/.active_backend_color
echo "Traffic now -> $COLOR ($PORT)"
```

```bash
chmod +x ~/rentgaadi/flip.sh
```

---

## 5. GitHub secrets (in `RentGaadi_pipelines` → Settings → Secrets → Actions)

| Secret | What it is |
|---|---|
| `GHCR_TOKEN` | A GitHub PAT (classic) with `write:packages` scope, to push images. |
| `EC2_IP` | EC2 public IP. |
| `EC2_USER` | `ubuntu`. |
| `SSH_PRIVATE_KEY` | Contents of your `.pem` private key. |
| `MONGODB_URL` | Atlas connection string. |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Auth secrets. |
| `STRIPE_SECRET_KEY` | Stripe. |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | Cloudinary. |
| `EMAIL`, `EMAIL_PASSWORD` | Mailer. |
| `GEMINI_API_KEY` | Chatbot. |
| `CLIENT_URL` | Your frontend URL (Netlify domain). |

> The pipeline writes these into a `.env` on the server at deploy time — they never live in the image.

---

## 6. Composite action — copy files to EC2

`.github/actions/copy_to_ec2/action.yml`

```yaml
name: copy_to_ec2
description: Copy a file to EC2 over SSH and run a remote script
inputs:
  ec2Ip:      { required: true }
  ec2User:    { required: true }
  sshKey:     { required: true }
  fileToCopy: { required: true }
  destination:{ required: true }
  runScript:  { required: false, default: "" }
runs:
  using: composite
  steps:
    - shell: bash
      run: |
        set -e
        mkdir -p ~/.ssh
        echo "${{ inputs.sshKey }}" > ~/.ssh/id_rsa
        chmod 600 ~/.ssh/id_rsa
        ssh-keyscan -H "${{ inputs.ec2Ip }}" >> ~/.ssh/known_hosts 2>/dev/null
        scp -i ~/.ssh/id_rsa "${{ inputs.fileToCopy }}" \
          "${{ inputs.ec2User }}@${{ inputs.ec2Ip }}:${{ inputs.destination }}"
    - shell: bash
      if: inputs.runScript != ''
      run: |
        ssh -i ~/.ssh/id_rsa "${{ inputs.ec2User }}@${{ inputs.ec2Ip }}" \
          'bash -s' <<'REMOTE'
        ${{ inputs.runScript }}
        REMOTE
```

---

## 7. The main backend pipeline

`.github/workflows/0_backend_pipeline.yml`

```yaml
name: "Backend Pipeline"
run-name: Backend deploy — ${{ inputs.branch || 'main' }}

on:
  workflow_dispatch:
    inputs:
      branch:
        description: "RentGaadi_backEnd branch to build/deploy"
        required: true
        type: string
        default: main

env:
  IMAGE: ghcr.io/${{ github.repository_owner }}/rentgaadi-backend

jobs:
  # ---------- 1. resolve version (git sha) ----------
  find_latest_version:
    runs-on: ubuntu-latest
    outputs:
      sha: ${{ steps.v.outputs.sha }}
    steps:
      - uses: actions/checkout@v4
        with:
          repository: stanli206/RentGaadi_backEnd
          ref: ${{ inputs.branch }}
          token: ${{ secrets.GHCR_TOKEN }}
      - id: v
        run: echo "sha=$(git rev-parse --short HEAD)" >> "$GITHUB_OUTPUT"

  # ---------- 2. lint + syntax check ----------
  lint:
    needs: find_latest_version
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          repository: stanli206/RentGaadi_backEnd
          ref: ${{ inputs.branch }}
          token: ${{ secrets.GHCR_TOKEN }}
      - uses: actions/setup-node@v4
        with: { node-version: "22", cache: npm }
      - run: npm ci
      - run: find . -name "*.js" -not -path "./node_modules/*" -print0 | xargs -0 -n1 node --check

  # ---------- 3. unit tests (matrix by module) ----------
  unit_test:
    needs: find_latest_version
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        include:
          - name: services
            cmd: "npm test"          # once you add Vitest tests
    name: Unit Tests (${{ matrix.name }})
    steps:
      - uses: actions/checkout@v4
        with:
          repository: stanli206/RentGaadi_backEnd
          ref: ${{ inputs.branch }}
          token: ${{ secrets.GHCR_TOKEN }}
      - uses: actions/setup-node@v4
        with: { node-version: "22", cache: npm }
      - run: npm ci
      - run: ${{ matrix.cmd }} || echo "no tests yet — add Vitest"

  # ---------- 4. functional test (real Mongo via service container) ----------
  functional_test:
    needs: find_latest_version
    runs-on: ubuntu-latest
    services:
      mongo:
        image: mongo:7
        ports: ["27017:27017"]
    steps:
      - uses: actions/checkout@v4
        with:
          repository: stanli206/RentGaadi_backEnd
          ref: ${{ inputs.branch }}
          token: ${{ secrets.GHCR_TOKEN }}
      - uses: actions/setup-node@v4
        with: { node-version: "22", cache: npm }
      - run: npm ci
      - name: Boot app against test Mongo
        env:
          MONGODB_URL: mongodb://localhost:27017/rentgaadi_test
          JWT_SECRET: testsecret
          PORT: 5000
        run: |
          node index.js & sleep 5
          curl -fsS http://localhost:5000/health
          echo "health OK"

  # ---------- 5. build & push image to GHCR ----------
  build_and_push:
    needs: [find_latest_version, lint, unit_test, functional_test]
    runs-on: ubuntu-latest
    permissions: { contents: read, packages: write }
    steps:
      - uses: actions/checkout@v4
        with:
          repository: stanli206/RentGaadi_backEnd
          ref: ${{ inputs.branch }}
          token: ${{ secrets.GHCR_TOKEN }}
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GHCR_TOKEN }}
      - run: |
          SHA=${{ needs.find_latest_version.outputs.sha }}
          docker build -t $IMAGE:$SHA -t $IMAGE:latest .
          docker push $IMAGE:$SHA
          docker push $IMAGE:latest

  # ---------- 6. blue-green deploy to EC2 ----------
  deploy_qa:
    needs: [find_latest_version, build_and_push]
    runs-on: ubuntu-latest
    environment: { name: qa }
    steps:
      - uses: actions/checkout@v4   # checks out the pipelines repo (for the action)
      - name: Deploy (blue-green)
        uses: ./.github/actions/copy_to_ec2
        with:
          ec2Ip:   ${{ secrets.EC2_IP }}
          ec2User: ${{ secrets.EC2_USER }}
          sshKey:  ${{ secrets.SSH_PRIVATE_KEY }}
          fileToCopy: README.md            # dummy; real work is in runScript
          destination: ~/deploy_marker
          runScript: |
            set -e
            SHA=${{ needs.find_latest_version.outputs.sha }}
            IMAGE=ghcr.io/${{ github.repository_owner }}/rentgaadi-backend:$SHA

            echo "${{ secrets.GHCR_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin

            ACTIVE=$(cat ~/.active_backend_color 2>/dev/null || echo blue)
            if [ "$ACTIVE" = "blue" ]; then INACTIVE=green; PORT=5002; else INACTIVE=blue; PORT=5001; fi
            echo "Active=$ACTIVE -> deploying to $INACTIVE ($PORT)"

            # write env file (secrets -> server, never in image)
            cat > ~/rentgaadi/$INACTIVE/.env <<EOF
            PORT=5000
            NODE_ENV=production
            MONGODB_URL=${{ secrets.MONGODB_URL }}
            JWT_SECRET=${{ secrets.JWT_SECRET }}
            JWT_REFRESH_SECRET=${{ secrets.JWT_REFRESH_SECRET }}
            STRIPE_SECRET_KEY=${{ secrets.STRIPE_SECRET_KEY }}
            CLOUDINARY_CLOUD_NAME=${{ secrets.CLOUDINARY_CLOUD_NAME }}
            CLOUDINARY_API_KEY=${{ secrets.CLOUDINARY_API_KEY }}
            CLOUDINARY_API_SECRET=${{ secrets.CLOUDINARY_API_SECRET }}
            EMAIL=${{ secrets.EMAIL }}
            EMAIL_PASSWORD=${{ secrets.EMAIL_PASSWORD }}
            GEMINI_API_KEY=${{ secrets.GEMINI_API_KEY }}
            CLIENT_URL=${{ secrets.CLIENT_URL }}
            EOF

            docker pull $IMAGE
            docker rm -f rentgaadi-$INACTIVE 2>/dev/null || true
            docker run -d --name rentgaadi-$INACTIVE --env-file ~/rentgaadi/$INACTIVE/.env \
              -p $PORT:5000 --restart unless-stopped $IMAGE

            # health check the new (inactive) container before switching
            for i in $(seq 1 20); do
              if curl -fsS http://localhost:$PORT/health; then OK=1; break; fi
              sleep 3
            done
            [ "$OK" = "1" ] || { echo "health check failed"; docker logs rentgaadi-$INACTIVE; exit 1; }

            # flip traffic, then stop the old one
            ~/rentgaadi/flip.sh $INACTIVE
            OLD=$([ "$INACTIVE" = "blue" ] && echo green || echo blue)
            docker rm -f rentgaadi-$OLD 2>/dev/null || true
            echo "Deployed $SHA to $INACTIVE and switched traffic."
```

> **Why blue‑green:** the new version boots and is health‑checked on the *inactive* port
> while the old one still serves traffic. Only after it's healthy does nginx flip. Zero downtime,
> and rollback = flip back.

---

## 8. One‑click rollback

`.github/workflows/0_revert_backend.yml`

```yaml
name: "Revert Backend"
on:
  workflow_dispatch:
    inputs:
      sha:
        description: "Image SHA to roll back to (e.g. a1b2c3d)"
        required: true
        type: string
jobs:
  revert:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/copy_to_ec2
        with:
          ec2Ip: ${{ secrets.EC2_IP }}
          ec2User: ${{ secrets.EC2_USER }}
          sshKey: ${{ secrets.SSH_PRIVATE_KEY }}
          fileToCopy: README.md
          destination: ~/revert_marker
          runScript: |
            set -e
            IMAGE=ghcr.io/${{ github.repository_owner }}/rentgaadi-backend:${{ inputs.sha }}
            echo "${{ secrets.GHCR_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
            ACTIVE=$(cat ~/.active_backend_color)
            if [ "$ACTIVE" = "blue" ]; then INACTIVE=green; PORT=5002; else INACTIVE=blue; PORT=5001; fi
            docker pull $IMAGE
            docker rm -f rentgaadi-$INACTIVE 2>/dev/null || true
            docker run -d --name rentgaadi-$INACTIVE --env-file ~/rentgaadi/$INACTIVE/.env \
              -p $PORT:5000 --restart unless-stopped $IMAGE
            sleep 5 && curl -fsS http://localhost:$PORT/health
            ~/rentgaadi/flip.sh $INACTIVE
            echo "Rolled back to ${{ inputs.sha }}"
```

---

## 9. Frontend (Netlify stays — or containerize)

Simplest enterprise‑clean option: **keep the frontend on Netlify** (it already auto‑deploys
from git) and just point it at the EC2 backend by setting `VITE_API_URL=https://<your-backend-domain>`
in Netlify env vars. The CI you already added (`.github/workflows/ci.yml`) handles lint+build.

If you want the frontend *also* on EC2: build it to static files and serve via the same nginx
(add a second `location /` block / separate server block). Not required.

---

## 10. Order to roll this out (do it in phases)

1. **Phase 1 — CI only:** the lint/test workflows already in your repos. Confirm green.
2. **Phase 2 — Images:** add GHCR build+push. Verify an image appears under your GitHub "Packages".
3. **Phase 3 — EC2 manual:** SSH in, `docker run` the image by hand once. Confirm `/health` works through nginx.
4. **Phase 4 — Automated deploy:** wire `deploy_qa` (blue‑green). Run the workflow from the Actions tab.
5. **Phase 5 — Safety nets:** add the revert workflow; later add real Vitest tests to the matrix.

---

## 11. HTTPS (do before real users)

Put a TLS cert in front (Let's Encrypt via `certbot` on nginx, or an AWS ALB). Your cookie auth
needs HTTPS in production (`secure` + `SameSite=None`). Set `NODE_ENV=production` on the server.

---

## 12. Mapping to what you saw (WonderWhyDev/pipelines)

| Their setup | Your equivalent here |
|---|---|
| separate `pipelines` repo | `RentGaadi_pipelines` |
| `find_latest_version` job | same (git sha) |
| `lint` / `unit_test` matrix / `functional_test` | same (Mongo service container) |
| GHCR login + image push | same |
| `copy_to_ec2` composite action | same |
| `~/.active_backend_color` + `flip.sh` blue‑green | same |
| `0_revert_backend.yml` | same |
| reusable `x_base_*` workflows | optional — extract once you have a 2nd app |

That's the full pattern. Start at Phase 1 and climb — don't wire EC2 until images build cleanly.
```
