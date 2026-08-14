# 🚀 Deployment Guide: ChronosQuery

This guide explains how to deploy the **ChronosQuery** application to the cloud for free using **Render** (for the Spring Boot backend, PostgreSQL, and Redis) and **Vercel** (for the React frontend).

---

## 🛠️ Step 1: Push Code Modifications to GitHub
Make sure all our local code modifications are committed and pushed to your GitHub repository:
```bash
git add .
git commit -m "chore: configure project for production deployment"
git push origin main
```

---

## 💾 Step 2: Provision Backing Services

### 1. PostgreSQL Database (Render)
1. Log in to [Render](https://dashboard.render.com/).
2. Click **New +** and select **PostgreSQL**.
3. Configure the database:
   * **Name**: `chronos-postgres`
   * **Database Name**: `chronos_db` (optional, defaults to `chronos_postgres`)
   * **User**: `postgres` (optional)
   * **Region**: Choose the region closest to you.
   * **Instance Type**: **Free**.
4. Click **Create Database**.
5. Once created, copy the **Internal Database URL** (e.g., `postgres://user:password@internal-host:5432/chronos_db`). You will use this for the backend service configuration.

### 2. Redis Cache (Render)
1. Go to your Render Dashboard, click **New +**, and select **Redis**.
2. Configure the cache:
   * **Name**: `chronos-redis`
   * **Region**: Match the region of your database.
   * **Instance Type**: **Free**.
3. Click **Create Redis**.
4. Once created, copy the **Internal Redis URL** (e.g., `redis://red-xxxxxxxxxx:6379`). Write down the host (`red-xxxxxxxxxx`) and port (`6379`) separately.

### 3. Kafka Broker (Upstash)
Since Render doesn't offer free Apache Kafka, we use **Upstash**, a serverless Kafka provider with a generous free tier (10k messages/day).
1. Sign up/log in at [Upstash Console](https://console.upstash.com/).
2. Click **Kafka** in the navigation bar and select **Create Cluster**.
3. Configure your cluster:
   * **Name**: `chronos-kafka`
   * **Region**: Match your database/web service region if possible (or closest equivalent).
4. Click **Create**.
5. Once created, go to the **Topics** tab and click **Create Topic**:
   * **Topic Name**: `record-updates`
   * **Partitions**: `1`
6. Go back to the **Details** tab, scroll to the **Connection Details** section, and copy the following configurations:
   * **Bootstrap Server** (e.g., `xxxx-xxxx-xxxx.upstash.io:9092`)
   * **Username** (provided in the Java config tab)
   * **Password** (provided in the Java config tab)

---

## ⚙️ Step 3: Deploy the Spring Boot Backend (Render)

1. On Render, click **New +** and select **Web Service**.
2. Connect your GitHub repository (`Satish-devara/CronosQuery`).
3. Configure the Web Service:
   * **Name**: `chronos-backend`
   * **Region**: Same region as your database.
   * **Branch**: `main`
   * **Runtime**: **Docker** (Render will automatically build and run the existing `Dockerfile`).
   * **Instance Type**: **Free**.
4. Click **Advanced** to add the following **Environment Variables**:

| Key | Value | Description |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://<INTERNAL_DB_HOST>:5432/chronos_db` | Replace with host from Render Postgres connection string (prefix with `jdbc:`) |
| `SPRING_DATASOURCE_USERNAME` | `postgres` (or your db user) | Database username |
| `SPRING_DATASOURCE_PASSWORD` | `<DATABASE_PASSWORD>` | Database password |
| `REDIS_HOST` | `<INTERNAL_REDIS_HOST>` | Host name of your Render Redis instance (without `redis://` or `:6379`) |
| `REDIS_PORT` | `6379` | Port of your Render Redis instance |
| `KAFKA_BOOTSTRAP_SERVERS` | `<BOOTSTRAP_SERVER>` | Upstash Kafka Bootstrap Server |
| `KAFKA_SECURITY_PROTOCOL` | `SASL_SSL` | Enable secure protocol for Upstash |
| `KAFKA_SASL_MECHANISM` | `PLAIN` | Set SASL mechanism |
| `KAFKA_SASL_JAAS_CONFIG` | `org.apache.kafka.common.security.plain.PlainLoginModule required username="<UPSTASH_USERNAME>" password="<UPSTASH_PASSWORD>";` | Substitute your Upstash Kafka username and password |
| `ALLOWED_ORIGINS` | `https://<YOUR-FRONTEND-APP>.vercel.app` | We will update this with your Vercel URL once the frontend is deployed |

5. Click **Create Web Service**. 
6. Wait for Render to build the Docker image and deploy. Once live, Render will display a public URL for your backend (e.g., `https://chronos-backend.onrender.com`).

---

## 💻 Step 4: Deploy the React Frontend (Vercel)

1. Log in to [Vercel](https://vercel.com/).
2. Click **Add New** and select **Project**.
3. Import your GitHub repository (`Satish-devara/CronosQuery`).
4. Configure the Project:
   * **Framework Preset**: Select **Vite** (Vercel should auto-detect this).
   * **Root Directory**: Click **Edit** and choose `frontend/chronos-frontend`.
5. Expand the **Environment Variables** section and add:

| Key | Value | Description |
|---|---|---|
| `VITE_API_BASE` | `https://chronos-backend.onrender.com` | Your public Render backend URL (no trailing slash) |

6. Click **Deploy**. Vercel will build and host your frontend, providing a public deployment URL (e.g., `https://chronos-frontend.vercel.app`).

---

## 🔄 Step 5: Update CORS on Backend
Once you have your Vercel URL:
1. Go back to your Render Web Service dashboard (`chronos-backend`).
2. Navigate to **Environment**.
3. Edit the `ALLOWED_ORIGINS` variable and set it to your exact Vercel URL (e.g., `https://chronos-frontend.vercel.app`).
4. Save the changes. Render will automatically redeploy the backend with the new CORS origin.

🎉 **Congratulations! Your ChronosQuery application is now live and fully operational in the cloud!**
