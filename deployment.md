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

### 2. Key Value Cache (Render Valkey)
On Render, Redis has been rebranded and upgraded to **Key Value** (which runs Valkey, a fully open-source, 100% compatible drop-in replacement for Redis).
1. Go to your Render Dashboard, click **New +**, and select **Key Value**.
2. Configure the cache:
   * **Name**: `chronos-redis`
   * **Region**: Match the region of your database.
   * **Instance Type**: **Free**.
3. Click **Create Key Value**.
4. Once created, copy the **Internal Connection URL** (e.g., `redis://red-xxxxxxxxxx:6379` or `valkey://red-xxxxxxxxxx:6379`). Write down the host (`red-xxxxxxxxxx`) and port (`6379`) separately.

### 3. Kafka Broker (Aiven)
Since Render doesn't offer free Apache Kafka, we use **Aiven**, which offers a completely free ($0/month) managed Apache Kafka cluster tier requiring **no credit card**.
1. Sign up/log in at [Aiven Console](https://console.aiven.io/).
2. Click **Create Service** and select **Apache Kafka**.
3. Choose the **Free** tier option.
4. Set the **Service Name** to `chronos-kafka` and select your cloud/region (e.g. AWS us-east-1).
5. Click **Create Free Service**.
6. Once the service starts:
   * In the Aiven console sidebar, click **Service settings**.
   * Scroll down to the **Advanced configuration** section, click **Configure**, then click **Add configuration options**.
   * Search for `letsencrypt_sasl`, select it, and set its value to **Enabled** (or true). Save the configuration. This secures your SASL endpoint with a public Let's Encrypt certificate that Spring Boot automatically trusts, resolving the "SSL handshake failed" error.
   * Go to the **Topics** tab, click **Add Topic**, name it `record-updates`, and click **Create topic**.
   * Go to the **Overview** tab, scroll to **Connection information**, and copy the **Service URI** (e.g., `chronos-kafka-xxxx.aivencloud.com:xxxxx`). This is your Bootstrap Server address.
   * Go to the **Users** tab (or check the Connection information panel) to copy the default service username (`avnadmin`) and generate/copy the password. Aiven uses **SCRAM-SHA-256** by default for connection authentication.

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
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://<HOST>/<DATABASE>` | E.g. `jdbc:postgresql://dpg-xxxxxxxxxx-a/chronos_db_va4p` (Do NOT embed user/password here) |
| `SPRING_DATASOURCE_USERNAME` | `<USER>` | E.g. `chronos_db_va4p_user` |
| `SPRING_DATASOURCE_PASSWORD` | `<PASSWORD>` | E.g. `Li7MiITkLdHkbq6qQYbBCwJG6EkeRfU4` |
| `REDIS_HOST` | `<INTERNAL_REDIS_HOST>` | Host name of your Render Key Value instance (without `redis://` or `:6379`) |
| `REDIS_PORT` | `6379` | Port of your Render Key Value instance |
| `KAFKA_BOOTSTRAP_SERVERS` | `<BOOTSTRAP_SERVER>` | Aiven Kafka Service URI / Bootstrap Server (from Connection Info) |
| `KAFKA_SECURITY_PROTOCOL` | `SASL_SSL` | Enable secure protocol for Aiven |
| `KAFKA_SASL_MECHANISM` | `SCRAM-SHA-256` | Aiven uses SCRAM-SHA-256 |
| `KAFKA_SASL_JAAS_CONFIG` | `org.apache.kafka.common.security.scram.ScramLoginModule required username="avnadmin" password="<AIVEN_PASSWORD>";` | Substitute your Aiven Kafka password |
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
