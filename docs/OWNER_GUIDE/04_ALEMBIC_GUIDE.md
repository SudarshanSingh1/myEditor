# Alembic Workflow & Guidelines

This document covers the complete lifecycle of Alembic migrations.

## Complete Alembic Lifecycle

1. **Modify Model**: Edit `backend/app/models/`.
2. **Generate**: `alembic revision --autogenerate -m "desc"`
3. **Review**: Inspect the python file in `alembic/versions/`.
4. **Test**: `alembic upgrade head` (locally).
5. **Commit**: Commit the migration file along with your code.
6. **Merge**: CI runs tests against the new schema.
7. **Deploy**: Production deployment script runs `alembic upgrade head` before the new API containers start serving traffic.

## Examples

**Adding a new column safely:**
If you add a non-nullable column to a table with existing data, the migration will crash in production.
*Bad:*
```python
sa.Column('new_field', sa.String(), nullable=False)
```
*Good:*
```python
# 1. Add as nullable
sa.Column('new_field', sa.String(), nullable=True)
# 2. Populate existing rows
op.execute("UPDATE my_table SET new_field = 'default_value'")
# 3. Alter to non-nullable
op.alter_column('my_table', 'new_field', nullable=False)
```

## Common Errors

### Revision Conflicts (Multiple Heads)
Occurs when two developers create migrations on different git branches, and both are merged.
**Error message:** `Multiple head revisions are present...`
**Fix:** 
Merge the branches in Alembic:
```bash
alembic merge heads -m "merge multiple heads"
```
Or, rebase one migration by manually changing its `down_revision` to point to the other's revision ID.

### Deleted Migration
If you delete a migration file that has already run, Alembic will complain about a missing revision.
**Fix:** You must remove that revision ID from the `alembic_version` table in the database manually.

## Reset Local DB
If your local database is beyond repair:
```bash
docker compose down -v
docker compose up -d db
cd backend && alembic upgrade head
```
*Note: This destroys all local data.*

## Safe Production Migration

Production migrations run in CI/CD or via startup scripts. 
- **Rule 1**: Migrations must run quickly. Avoid locking massive tables for long periods.
- **Rule 2**: Avoid removing columns or tables until you are 100% sure no running code requires them. (Use a two-step deployment: 1. Remove code using column. 2. Remove column in DB).

## Rollback Strategy

If a deployment fails due to a bad migration:
1. Stop the new API containers.
2. Run `alembic downgrade <previous_revision>`.
3. Start the old API containers.

## Decision Tree

- **Did I change a model?** -> Yes -> Run `autogenerate`.
- **Did `autogenerate` drop a table I didn't touch?** -> Yes -> Check if you forgot to import your new model in `backend/alembic/env.py`.
- **Am I adding a constraint to existing data?** -> Yes -> Write a custom data migration first inside the `upgrade()` function to ensure existing data complies.
