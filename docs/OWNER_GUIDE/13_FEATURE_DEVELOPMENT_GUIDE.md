# Feature Development Guide

Before you write a single line of code for a new feature, follow this workflow to ensure quality and alignment with the architecture.

## 1. Requirements
Understand exactly what the user needs.
- What is the goal?
- Are there edge cases?
- How should it behave for Guests vs Logged-in users vs Admins?

## 2. Architecture
Decide where the code will live.
- Will this require a new database table?
- Will this require a new third-party dependency?
- Will it require a new background task?

## 3. Database changes
If required:
1. Create the SQLAlchemy Model.
2. Run Alembic autogenerate.
3. Review the SQL.
4. Upgrade your local DB.

## 4. API changes
1. Create Pydantic schemas (Request/Response).
2. Create the Repository logic (DB queries).
3. Create the Service logic (Business rules).
4. Create the Router endpoint.
5. Write a test for the endpoint.

## 5. Frontend changes
1. Write the React Query hook in `app/hooks/`.
2. Create necessary UI components in `app/components/`.
3. Assemble the page or update the existing UI.
4. Ensure error states and loading states are handled.

## 6. Tests
- Did you write backend unit tests for the Service?
- Did you write API tests for the Router?
- Did you write frontend tests for complex logic?

## 7. Documentation
- Update `README.md` if the setup process changed.
- Update `OWNER_GUIDE/` if architectural rules changed.
- The OpenAPI (Swagger) docs will update automatically via FastAPI.

## 8. Deployment
- Does this feature require environment variables? If so, add them to `.env.example` and the production secrets manager.
- Does it require a database migration in production?

## 9. Review Checklist (Before PR Approval)
- [ ] Code passes all linters (Ruff, Oxlint).
- [ ] Type checks pass (TypeScript).
- [ ] All tests pass.
- [ ] N+1 queries were avoided.
- [ ] Pydantic schemas validate all inputs securely.
- [ ] React Query is used for data fetching (no bare `useEffect`).
- [ ] Edge cases (network failure, bad input) are handled gracefully.
