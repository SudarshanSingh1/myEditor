# Owner's Operational Checklist

This handbook provides a structured list of duties and checks for the Project Owner/Maintainer.

## Daily Tasks
- [ ] **Check Error Logs**: Briefly review APM (e.g., Sentry) for any new unhandled exceptions.
- [ ] **Check Server Health**: Verify disk space isn't dangerously low due to Docker logs.
- [ ] **Review PRs**: Ensure any merged code aligns with the architecture guides.

## Weekly Tasks
- [ ] **Update Dependencies**: Check for critical security patches in `package.json` and `requirements.txt`.
- [ ] **Clean Docker**: Run `docker system prune` on staging/production to clear old images.
- [ ] **Review Metrics**: Check API latency and database load.

## Monthly Tasks
- [ ] **Test Backups**: Manually download a database backup and restore it locally to ensure the backup system actually works.
- [ ] **Audit Users**: Check for anomalous accounts or excessive resource usage in the execution engine.
- [ ] **Refactoring Sprint**: Dedicate time to resolving technical debt identified during the month.

---

## Task-Specific Checklists

### Before Merge
- [ ] Did CI pass?
- [ ] Are there tests for the new logic?
- [ ] Does it follow the Frontend/Backend architecture guides?

### Before Deployment
- [ ] Refer to `18_RELEASE_CHECKLIST.md`.
- [ ] Are environment variables synced?

### Before Schema Changes
- [ ] Is the migration backward compatible?
- [ ] Was the SQL reviewed via `alembic upgrade head --sql`?

### Before Docker Rebuild
- [ ] Did you update a `Dockerfile` or dependency list?
- [ ] Do the new dependencies bloat the image size significantly?

### Before Deleting Code
- [ ] Is it completely unused across the entire repository?
- [ ] Have you checked for dynamic imports or reflection that might use it?

### Before Optimization
- [ ] Do you have a baseline benchmark to prove the optimization works?
- [ ] Is the optimization worth the added complexity?

### Before Refactoring
- [ ] Are there existing tests covering the code you are about to change? (If not, write them first).

### Before Introducing AI-Generated Code
- [ ] Have you reviewed every line of the generated code?
- [ ] Does it hallucinate APIs or dependencies?
- [ ] Does it conform to this project's specific folder structure and rules? (AI often suggests generic React/FastAPI patterns that break our rules).
