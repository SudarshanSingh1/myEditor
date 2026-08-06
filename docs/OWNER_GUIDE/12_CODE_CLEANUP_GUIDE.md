# Code Cleanup Guide

Technical debt accumulates. This guide dictates when and how to clean it up safely.

## When to clean code
- **Continuously**: Apply the "Boy Scout Rule" — leave the code slightly cleaner than you found it.
- **Dedicated Sprints**: If debt affects development speed, dedicate a sprint to refactoring.
- **Before adding a major feature**: Ensure the foundation is solid before building on top of it.

## How to remove dead code
Dead code confuses future developers and slows down compilation/startup. If code is unused, delete it. Don't comment it out. Git remembers.

### Unused APIs
1. Search the frontend (`app/`) for the endpoint URL.
2. If it's not called, delete the Router endpoint in `backend/app/api/`.
3. Check if the underlying Service or Repository methods are used elsewhere. If not, delete them too.

### Unused components
Modern IDEs and tools like `ts-prune` can identify React components that are exported but never imported. Delete them.

### Unused models & migrations
If a database table is no longer needed:
1. Ensure no code queries it.
2. Create an Alembic migration to drop the table.
3. Delete the SQLAlchemy model.

*Do not delete old migration files in `alembic/versions/` just because they are old. They are needed to rebuild the database from scratch.*

### Unused packages
- **Frontend**: Run `npx depcheck` to find unused npm packages in `package.json`. Uninstall them.
- **Backend**: Use `pip-audit` or manually review `requirements.txt` periodically.

### Unused imports
- **Frontend**: Oxlint handles this automatically on commit.
- **Backend**: Ruff handles this automatically on commit.

## Refactoring Rules
1. **Never refactor without tests**: If the code you want to clean doesn't have tests, write tests for its current behavior first.
2. **One thing at a time**: Don't mix a refactoring commit with a feature commit.
3. **Keep the API stable**: Refactoring the internal logic of a Service should not break the HTTP response expected by the frontend.

## How to safely optimize code
Optimization often makes code harder to read.
1. Profile first to prove there is a problem.
2. Write a benchmark test.
3. Implement the optimization.
4. Verify the benchmark improved without breaking existing tests.
