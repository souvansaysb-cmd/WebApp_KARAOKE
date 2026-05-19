#!/bin/bash

# Run Prisma migrations
echo "Running Prisma migrations..."
cd backend
npx prisma migrate dev --name init_schema

echo "Migration completed!"
