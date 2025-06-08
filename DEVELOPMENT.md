# Development Setup

## Unified Development Server

This project now has a unified development setup that runs both frontend and backend with a single command.

### Quick Start

```bash
npm run dev
```

This single command will:

- ✅ Start the **Wrangler backend server** on `http://localhost:8787`
- ✅ Start the **Vite frontend server** on `http://localhost:5173`
- ✅ Enable **hot reloading** for both frontend and backend changes
- ✅ Automatically proxy API calls from frontend to backend

### What You Get

**🔥 Hot Reloading for Everything:**

- Frontend changes (React, CSS, TypeScript) → Instant reload
- Backend changes (Worker code) → Automatic restart and reload
- No need to manually restart servers

**🎯 Single Port Access:**

- Open your browser to `http://localhost:5173/`
- All API calls are automatically proxied to the backend
- No CORS issues or manual port switching

**📊 Color-Coded Logs:**

- `backend` logs in **blue**
- `frontend` logs in **green**
- Easy to distinguish between frontend and backend activity

### Available Scripts

```bash
npm run dev          # Start unified development server
npm run dev:backend  # Start only backend (Wrangler)
npm run dev:client   # Start only frontend (Vite)
npm run start        # Alias for npm run dev
npm run build        # Build both frontend and backend
npm run deploy       # Deploy to Cloudflare
```

### Architecture

- **Frontend**: React + Vite (port 5173)
- **Backend**: Cloudflare Workers + D1 Database (port 8787)
- **Proxy**: Vite proxies all API calls (`/login`, `/register`, `/vocab`, etc.) to backend
- **Concurrency**: Both servers run in parallel using `concurrently`

### Stopping the Server

Press `Ctrl+C` once to stop both servers simultaneously.

### Troubleshooting

If you encounter issues:

1. Make sure no other processes are using ports 5173 or 8787
2. Try stopping all processes: `pkill -f "wrangler\|vite"`
3. Restart with `npm run dev`
