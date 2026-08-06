# Release Checklist

Follow this checklist for every major production deployment to ensure zero downtime and maximum stability.

## Pre-deployment
- [ ] Ensure all PRs are merged to `main`.
- [ ] Verify GitHub Actions (CI) passed successfully.
- [ ] Check if the deployment requires new environment variables.
- [ ] Check if the deployment includes database migrations.
- [ ] Communicate the upcoming release to the team.

## Migration (If applicable)
- [ ] Review the Alembic migration script one last time.
- [ ] Ensure it does not drop tables or columns currently in use by the live code.
- [ ] Take a manual backup of the production database before running the migration.

## Testing
- [ ] Deploy to the Staging environment first.
- [ ] Perform a manual sanity check on Staging (Login, Write Code, Execute Code).
- [ ] Verify Staging migrations ran cleanly.

## Deployment
- [ ] Build and tag the new Docker images.
- [ ] Push images to the registry.
- [ ] On the production server, pull the new images.
- [ ] Run `docker compose up -d`.

## Monitoring (Next 15 Minutes)
- [ ] Check `docker compose logs -f api` for startup errors or migration failures.
- [ ] Monitor Sentry for new, unhandled exceptions.
- [ ] Check server CPU and Memory usage via `docker stats` or `htop`.
- [ ] Verify the `/api/health` endpoint is returning 200 OK.

## Rollback (If needed)
- [ ] If critical errors occur, immediately revert the Docker image tag in the compose file.
- [ ] Run `docker compose up -d` to restore the previous version.
- [ ] If the database was corrupted, restore from the pre-deployment backup.

## Post-deployment
- [ ] Verify the new feature is working in production.
- [ ] Close the related issue tickets.
- [ ] Update the `CHANGELOG.md`.
