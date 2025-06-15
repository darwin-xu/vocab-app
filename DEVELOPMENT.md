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

## Workspace Cleanup Plan

### Unnecessary Files to Remove

The following files have been identified as unnecessary and can be safely deleted:

#### 1. Unused Test Setup Files
```bash
# Remove duplicate/unused test setup files
rm client/src/test/setup-new.ts
rm client/src/test/global-setup.ts
```

These files are not referenced in any configuration and duplicate functionality in the main `setup.ts` file.

#### 2. Unused Schema Test Data
```bash
# Remove unused test schema file
rm src/schemas/test.json
```

This file contains test data but is not imported or used anywhere in the codebase.

#### 3. Generic Template Files
```bash
# Remove default Vite template README
rm client/README.md
```

This is the default Vite + React template README that doesn't apply to our project. The main README.md covers project setup.

### Files to Consider for Cleanup

#### 4. Minimal Documentation Files
```bash
# Consider consolidating AGENTS.md into DEVELOPMENT.md
cat AGENTS.md >> DEVELOPMENT.md  # Review content first
rm AGENTS.md
```

The AGENTS.md file only contains 6 lines of basic guidelines that could be merged here.

#### 5. Generic Security Policy
```bash
# Remove if not maintaining active security policy
rm SECURITY.md
```

Contains generic GitHub template content that doesn't match the project.

#### 6. Development-Only Test Files
```bash
# Consider removing comparison test if no longer needed
rm test/json2md-comparison.spec.ts
```

This appears to be a development/debugging test for library comparison rather than functional testing.

### Cleanup Commands

To perform the recommended cleanup:

```bash
# Safe deletions (recommended)
rm client/src/test/setup-new.ts
rm client/src/test/global-setup.ts
rm src/schemas/test.json
rm client/README.md

# Optional deletions (review first)
rm AGENTS.md
rm SECURITY.md
rm test/json2md-comparison.spec.ts
```

### Post-Cleanup Verification

After cleanup, verify everything still works:

```bash
# Test that everything builds and runs
npm run test:all
npm run build
npm run dev
```

### Repository Guidelines (from AGENTS.md)

- Indent with **4 spaces**.
- Run `npm test` before committing.
- Use Prettier for code formatting.
