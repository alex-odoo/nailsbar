# NailsBar — PWA nail salon booking

> Full context: `~/Documents/ClaudeMemory/Projects/NailsBar.md`

## Quick Reference

- **Production**: https://nailsbar.store
- **Repo**: github.com/alex-odoo/nailsbar | Local: `/Users/mac/nailsbar`
- **Server**: soltis-prod 195.201.91.52 (shared with Soltis, port 3001)
- **SSH**: `ssh -i ~/.ssh/rteam_hetzner root@195.201.91.52`
- **Stack**: Next.js 16 + TypeScript + Prisma 5 + SQLite + Tailwind v4
- **DB**: SQLite in Docker volume `nailsbar_sqlite_data` → `/data/nailsbar.db`
- **Bot**: @NailsbarTOP_bot, webhook `https://nailsbar.store/api/telegram/webhook`
- **Auth**: PIN-only (Admin: 858430, Master: 666666)

## Deploy

```bash
cd /Users/mac/nailsbar
git add . && git commit -m "..." && git push origin main
rsync -avz --delete --exclude='.git' --exclude='node_modules' --exclude='.env*' \
  -e "ssh -i ~/.ssh/rteam_hetzner" ./ root@195.201.91.52:/opt/nailsbar/
ssh -i ~/.ssh/rteam_hetzner root@195.201.91.52 \
  "cd /opt/nailsbar && docker compose build --no-cache && docker compose up -d"
```

## Critical Gotchas

1. **bcryptjs import**: `import * as bcrypt from 'bcryptjs'` (NOT default — esbuild bug)
2. **Base image**: `node:20-slim` (NOT alpine)
3. **Prisma binary targets**: `["native", "linux-musl-openssl-3.0.x"]`
4. **seed.ts** compiled via esbuild → `prisma/seed.js`
5. **SQLite in Docker volume** — `docker compose down -v` WILL DESTROY DATA
6. **Shares soltis-prod** with Soltis.ua — don't break nginx

## Structure

```
app/
  staff/    — Internal: dashboard, week view, clients, settings (PIN auth)
  book/     — Public: multi-service booking wizard
  api/      — REST: appointments, clients, slots, services, auth, telegram
```
