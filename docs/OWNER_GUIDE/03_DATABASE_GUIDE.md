# Database Guide

This project uses PostgreSQL 15, managed by **SQLAlchemy** (ORM) and **Alembic** (Migrations).

## When changing SQLAlchemy models

Any time you modify a file in `backend/app/models/` (adding a column, changing a type, adding an index, creating a new model), you **MUST** generate an Alembic migration.

## When Alembic migration is required
- Adding, removing, or renaming a table.
- Adding, removing, or renaming a column.
- Changing column constraints (nullable, unique, default).
- Adding or modifying indexes.
- Changing column data types.

## When migration is NOT required
- Changing a Pydantic schema in `backend/app/schemas/`.
- Changing a FastAPI route or business logic.
- Adding a relationship that only exists at the ORM level (e.g., adding `back_populates` without adding a Foreign Key column), though it's best practice to verify it doesn't affect the schema.

## How to create migration

1. Ensure your database is running (`docker compose up -d db`).
2. Run the autogenerate command from the `backend` directory:
   ```bash
   cd backend
   alembic revision --autogenerate -m "added_user_preferences"
   ```
3. A new file will be created in `backend/alembic/versions/`.

## How to review migration

**Never trust autogenerate blindly.** Open the generated file in `alembic/versions/` and check:
- Did it drop a table you didn't mean to drop? (Common if a model isn't imported in `env.py`).
- Did it name constraints sensibly?
- Are the data types correct for PostgreSQL?

To see the exact SQL it will run:
```bash
alembic upgrade head --sql
```

## How to upgrade
Apply the migration to your local database:
```bash
alembic upgrade head
```

## How to downgrade
If you made a mistake and haven't merged the code yet, you can rollback one revision:
```bash
alembic downgrade -1
```

## How to verify schema
Check the database directly using `psql`:
```bash
docker exec -it myeditor-db-1 psql -U hamara_user -d hamara_db -c "\d your_table_name"
```

## Common migration failures

### Broken revision recovery
If a migration fails midway, your database might be in an inconsistent state.
1. Check the `alembic_version` table: `SELECT * FROM alembic_version;`
2. Manually fix the database schema using `psql` to match the expected state, or drop the newly created objects.
3. Update the `alembic_version` table manually if needed.

### Missing alembic_version recovery
If the `alembic_version` table is empty but the tables exist, you can "stamp" the database to the current head without running the migrations:
```bash
alembic stamp head
```

## Development database vs Production database

- **Development**: You can afford to drop the database and recreate it if migrations get hopelessly tangled. (`docker volume rm myeditor_pgdata`)
- **Production**: Migrations **MUST** be backwards compatible. Never drop columns that are currently in use by the live application.
