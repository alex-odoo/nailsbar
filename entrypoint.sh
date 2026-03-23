#!/bin/sh
set -e

PRISMA="node node_modules/prisma/build/index.js"

echo "Running database migrations..."
$PRISMA db push --skip-generate

# Seed only if DB is empty (no staff records)
STAFF_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.staff.count().then(n => { console.log(n); p.\$disconnect(); });
" 2>/dev/null || echo "0")

if [ "$STAFF_COUNT" = "0" ]; then
  echo "Seeding database..."
  node prisma/seed.js
fi

echo "Starting server..."
exec node server.js
