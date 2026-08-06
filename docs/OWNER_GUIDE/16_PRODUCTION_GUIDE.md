# Production Guide

Production is sacred. Treat it with respect.

## Production Safety: Never do these things
1. **Never** run `docker compose down -v` in production. It will delete the database volume.
2. **Never** connect your local API directly to the production database unless you are in a read-only transaction.
3. **Never** merge a migration that drops a column without a two-step deployment process (remove code usage first, then remove column).
4. **Never** commit `.env` or any production secrets to Git.
5. **Never** run the Vite dev server (`npm run dev`) or FastAPI in `--reload` mode in production.

## Safe Deployment
- Always use tagged Docker images (e.g., `api:v1.2.0`), never `latest`. This ensures you know exactly what is running and can rollback easily.
- Deploy during low-traffic periods if breaking changes are involved.

## Database Safety
- Ensure `pg_hba.conf` and Docker networking prevent external access to port 5432/5433. The database should only be accessible by the API container.
- Use strong, generated passwords for the production database user.

## Rollback
If a deployment causes a critical issue:
1. Revert to the previous Docker image tag.
2. Restart the containers.
3. If the database schema changed, you must run `alembic downgrade` *before* reverting the API code, or the old code will crash against the new schema.

## Monitoring
- **Uptime**: Use a tool like UptimeRobot to ping the `/api/health` endpoint every minute.
- **Errors**: Integrate Sentry in both the FastAPI backend and React frontend to catch unhandled exceptions.
- **Docker**: Monitor host CPU and RAM. The execution engine can spike usage rapidly.

## Backups
- Configure automated daily backups of the PostgreSQL volume.
- Use `pg_dump` via a cron job and upload the encrypted SQL file to secure cloud storage (e.g., AWS S3).
- Test restoring from backups monthly. A backup you haven't tested restoring is not a backup.

## Alerts
Set up alerts for:
- API HTTP 500 error spikes.
- Host machine CPU > 90% for more than 5 minutes.
- Host machine disk space < 20% (Docker images and logs consume disk space quickly).
- Database connections nearing the limit.
