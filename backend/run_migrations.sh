#!/bin/bash
# Run database migrations

# Database connection info - update these with your actual values
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-job_assistant_db}"
DB_USER="${DB_USER:-postgres}"

echo "Running migrations..."

# Run migrations
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f migrations/001_add_notes_column.sql
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f migrations/002_add_deadline_column.sql

echo "✅ Migrations complete!"
