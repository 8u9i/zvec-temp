# 🚄 Zvec Vector Database - Railway Deployment

A **Railway-ready** deployment package for [Zvec](https://github.com/alibaba/zvec) - Alibaba's lightweight, lightning-fast in-process vector database.

This package wraps Zvec as a REST API service with a beautiful web UI, making it easy to deploy and use as a standalone vector database service.

---

## 📦 What's Included

```
zvec-railway/
├── docker-compose.yml     # 🎯 Drag this into Railway canvas
├── railway.toml           # Config as Code
├── README.md              # This file
│
├── api/                   # Backend API Service
│   ├── Dockerfile         # Multi-stage Docker build
│   ├── app.py             # FastAPI REST API
│   └── requirements.txt   # Python dependencies
│
└── ui/                    # Frontend UI Service
    ├── Dockerfile         # Next.js optimized build
    ├── src/               # Source code
    ├── public/            # Static assets
    └── package.json       # Node dependencies
```

---

## 🚀 Quick Deploy Options

### Option 1: Docker Compose (Recommended - Drag & Drop)

1. **Go to [Railway](https://railway.app)** and create a new project
2. **Drag the `docker-compose.yml` file** directly into the Railway canvas
3. Railway automatically deploys both services:
   - **zvec-api** - Vector database API (port 8000)
   - **zvec-ui** - Web interface (port 3000)
4. Get your public URLs from the service settings

### Option 2: GitHub Integration

1. Push this folder to a GitHub repository
2. In Railway, click **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Railway auto-detects Docker Compose and deploys

### Option 3: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

---

## 🎨 UI Features

The web interface includes:

| Tab | Features |
|-----|----------|
| **Insert** | Add documents with vectors and metadata, generate random vectors |
| **Search** | Vector similarity search with top-k results, score display |
| **Documents** | Quick actions, API endpoint reference |

### Design
- Clean gray background (`#f5f5f5`)
- Black outlined buttons
- Simple, minimal interface
- Responsive layout

---

## 🔧 Configuration

### Environment Variables

**API Service (`zvec-api`):**

| Variable | Default | Description |
|----------|---------|-------------|
| `ZVEC_DATA_PATH` | `/app/zvec_data` | Path for data storage |
| `ZVEC_DIMENSION` | `128` | Vector dimension |
| `PORT` | `8000` | Server port |

**UI Service (`zvec-ui`):**

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://zvec-api:8000` | Backend API URL |
| `PORT` | `3000` | UI server port |

### Volume Persistence

To persist data across deployments:

1. Go to **zvec-api** service → **Volumes** tab
2. Click **New Volume**
3. Mount at `/app/zvec_data`

---

## 📡 API Endpoints

Once deployed, your Zvec API provides:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info |
| `/health` | GET | Health check |
| `/docs` | GET | Interactive API docs (Swagger) |
| `/collection/info` | GET | Collection statistics |
| `/documents` | POST | Insert single document |
| `/documents/batch` | POST | Insert multiple documents |
| `/search` | POST | Vector similarity search |
| `/documents/{id}` | DELETE | Delete document by ID |
| `/collection` | DELETE | Clear all documents |

### Example Usage

```bash
# Insert a document
curl -X POST https://your-api.railway.app/documents \
  -H "Content-Type: application/json" \
  -d '{
    "vector": [0.1, 0.2, 0.3, ...],
    "metadata": {"title": "Example"}
  }'

# Search for similar vectors
curl -X POST https://your-api.railway.app/search \
  -H "Content-Type: application/json" \
  -d '{
    "vector": [0.1, 0.2, 0.3, ...],
    "top_k": 10
  }'
```

---

## ⚡ Flash Optimization

After deploying, consider these Railway best practices:

### 1. **Add a Volume for Persistence** ⚠️ CRITICAL
Without a volume, data is ephemeral and lost on each deployment:
```
zvec-api → Volumes → New Volume → Mount at /app/zvec_data
```

### 2. **Use Private Networking**
The UI connects to API via Railway's private network:
```
http://zvec-api:8000  # Private network (secure, fast)
```

### 3. **Set Up Custom Domains** (Optional)
```
zvec-ui → Settings → Custom Domain → Add your domain
zvec-api → Settings → Custom Domain → Add api.yourdomain.com
```

### 4. **Enable Auto-Scaling** (Pro Feature)
For production workloads:
```
Settings → Scaling → Enable Autoscaling
```

### 5. **Add Monitoring**
Railway provides built-in metrics:
```
Service → Metrics → View CPU/Memory usage
```

---

## 🔒 Production Checklist

- [ ] Attach a persistent volume to `zvec-api`
- [ ] Set appropriate resource limits
- [ ] Configure custom domain (optional)
- [ ] Enable Railway's built-in logging
- [ ] Set up monitoring alerts
- [ ] Review environment variables security
- [ ] Set `ZVEC_DIMENSION` correctly before first use

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │
│   zvec-ui       │────▶│   zvec-api      │
│   (Next.js)     │     │   (FastAPI)     │
│   Port: 3000    │     │   Port: 8000    │
│                 │     │                 │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   Volume        │
                        │   (persistent)  │
                        │   /zvec_data    │
                        └─────────────────┘
```

---

## 📚 Learn More

- [Zvec Documentation](https://zvec.org/en/docs/)
- [Railway Documentation](https://docs.railway.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)

---

## 📝 License

This deployment wrapper is provided as-is. Zvec is licensed under Apache 2.0.
