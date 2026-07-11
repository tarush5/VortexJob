# Deployment Guide

This guide describes how to deploy the VortexJob Scheduler in production.

Since VortexJob uses a local SQLite database, the Express API server and the Worker background process must run on the same file system to share the database file. To simplify hosting and reduce costs, the project includes a custom process supervisor (`start-production.js`) that runs both processes inside a single container instance, making it fully compatible with single-instance container platforms.

---

## Environment Variables

| Variable | Description | Default | Required |
|---|---|---|---|
| `PORT` | The port the HTTP API and WebSocket server listen on | `3000` | No |
| `NODE_ENV` | Mode of operation | `production` | Yes |
| `JWT_SECRET` | Secret key used to sign and verify auth tokens | `dev-secret-key` | **Yes (in prod)** |
| `DB_PATH` | Path to the SQLite database file | `/app/backend/data/jobs.db` | Yes |
| `GEMINI_API_KEY` | Google Gemini API Key for AI failure diagnostics | `""` | No (falls back to rules) |

---

## 1. Docker Compose (Self-Hosted VPS)

To deploy the scheduler on your own Linux server or VPS using Docker Compose:

1. Clone this repository onto your server.
2. Install Docker and Docker Compose.
3. Create a `.env` file in the root directory:
   ```env
   JWT_SECRET=your-secure-production-jwt-secret-here
   GEMINI_API_KEY=your-gemini-api-key-optional
   ```
4. Build and start the container in detached mode:
   ```bash
   docker compose up -d --build
   ```
5. The dashboard and API will be accessible on port `3000`. Database records are saved persistently under the `vortexjob-db-data` volume.

---

## 2. Deploying on Fly.io

Fly.io is an excellent platform for this deployment because it supports persistent volumes natively.

1. Install the Fly CLI and log in:
   ```bash
   fly auth login
   ```
2. Initialize your application (do not deploy yet):
   ```bash
   fly launch --no-deploy
   ```
3. Create a 1GB persistent volume in your chosen region for the SQLite database:
   ```bash
   fly volumes create vortexjob_db_volume --size 1 --region iad
   ```
4. Set your production secrets:
   ```bash
   fly secrets set JWT_SECRET="your-secure-secret" GEMINI_API_KEY="your-gemini-key"
   ```
5. Deploy the application:
   ```bash
   fly deploy
   ```

---

## 3. Deploying on Railway

Railway supports deploying multi-stage Dockerfiles and mounting persistent disks.

1. Go to [Railway](https://railway.app/) and create a new project.
2. Choose **Deploy from GitHub repo** and select your repository.
3. In your service settings under **Variables**, add:
   - `JWT_SECRET`: (Generate a secure random string)
   - `GEMINI_API_KEY`: (Your Google Gemini API Key, optional)
4. Go to **Settings** > **Volumes** > **Add Volume**.
   - Set the mount path to `/app/backend/data`.
5. Railway will automatically detect the root `Dockerfile` and build it. Once completed, your app will be online.

---

## 4. Deploying on Render

To deploy on Render, we will use a **Web Service** with a persistent disk.

1. Create a new **Web Service** on Render and link your repository.
2. Configure the following settings:
   - **Language**: `Docker`
   - **Branch**: `main` (or your production branch)
3. Under **Advanced**, add a **Disk**:
   - **Mount Path**: `/app/backend/data`
   - **Name**: `vortexjob-data`
   - **Size**: `1 GB`
4. Under **Environment Variables**, add:
   - `JWT_SECRET`: (your secure key)
   - `DB_PATH`: `/app/backend/data/jobs.db`
   - `GEMINI_API_KEY`: (optional)
5. Save and deploy.

---

## 5. Manual VPS Deployment (PM2 / Systemd)

If you prefer to run the application on a VPS without Docker:

1. Install Node.js v20+ and PM2 globally on your server:
   ```bash
   npm install pm2 -g
   ```
2. Build the entire project from the root:
   ```bash
   npm install --prefix backend
   npm install --prefix frontend
   npm run build --prefix frontend
   npm run build --prefix backend
   ```
3. Set your production environment variables in your server session or `.env` file.
4. Launch both the API server and worker using PM2:
   ```bash
   # Start API server
   pm2 start backend/dist/index.js --name "vortexjob-api"
   # Start Job Worker
   pm2 start backend/dist/worker/worker-process.js --name "vortexjob-worker"
   ```
5. Save the PM2 list and configure it to run on system boot:
   ```bash
   pm2 save
   pm2 startup
   ```
