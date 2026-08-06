# Contributing to Hamara Editor

First off, thank you for considering contributing to Hamara Editor! It's people like you that make this tool great.

## Workflow

1. Fork the repo and create your branch from `main`.
2. Ensure you have Docker running locally.
3. Make your changes.
4. Issue a pull request.

## Branch Naming

Use the following convention for branch names:
- `feat/your-feature-name`
- `bugfix/issue-description`
- `docs/update-readme`
- `refactor/clean-up-xyz`

## Commit Naming

We use Conventional Commits.
- `feat: add python execution support`
- `fix: resolve auth cookie bug`
- `docs: update architecture diagrams`
- `chore: update dependencies`

## PR Workflow & Review

- Create a PR against the `main` branch.
- Fill out the PR template completely.
- Request review from `@core-team` or the specific CODEOWNER.
- Address any review comments. 
- Wait for CI to pass before the merge is approved.

## Testing

Before submitting a PR, you **must**:
- Run backend tests: `cd backend && pytest`
- Run frontend tests: `cd app && npm run test`
- Ensure linters pass: `ruff check` (backend) and `oxlint` (frontend).

## Coding Standards

### Python (Backend)
- Use type hints for all function signatures.
- Adhere to the layered architecture (Routers -> Services -> Repositories).
- Format code using Ruff.

### TypeScript (Frontend)
- Avoid `any`. Define interfaces for all data structures.
- Keep components small and pure.
- Use React Query for data fetching; never use `useEffect` for API calls directly.
