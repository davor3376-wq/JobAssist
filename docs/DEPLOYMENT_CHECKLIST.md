# Deployment Checklist

## Frontend
- Set `VITE_API_URL` to the production backend API URL.
- Confirm the deployed domain matches the backend CORS configuration.
- Run:
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `npm run test:e2e`

## Backend
- Set:
  - `SECRET_KEY`
  - `DATABASE_URL`
  - `FRONTEND_URL`
  - `ALLOWED_ORIGINS`
  - `LOG_LEVEL`
  - optional `SENTRY_DSN`
  - mail provider env vars
- Confirm the database is reachable and migrations are applied.
- Confirm `/health` responds successfully.
- Confirm `/health/dependencies` reports database/providers correctly.
- Verify structured logs include `request_id`.

## Smoke Checks After Deploy
- Register a new account.
- Log in with an existing account.
- Verify email flow works.
- Open billing page and confirm usage counters load.
- Create, run, edit, and delete a job alert.
- Save a job and open job detail actions.

## Rollback Readiness
- Keep the last known-good frontend deployment available.
- Keep the last known-good backend release available.
- Do not rotate production secrets during an unrelated deploy unless required.
