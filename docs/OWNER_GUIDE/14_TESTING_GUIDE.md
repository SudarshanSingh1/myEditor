# Testing Guide

Automated testing ensures the project remains stable as it scales.

## Frontend Tests

Located in `app/__tests__/` or next to components.
- **Framework**: Vitest and React Testing Library.
- **Command**: `npm run test`
- **Focus**: Test component rendering, user interactions (clicks, typing), and Zustand state changes.
- Do not test React Query data fetching heavily in component tests; mock the hook instead or use a mock server (MSW).

## Backend Tests

Located in `backend/tests/`.
- **Framework**: Pytest.
- **Command**: `pytest`
- **Focus**: Test business logic in Services, database queries in Repositories, and endpoint responses in Routers.
- Use the `httpx.AsyncClient` or FastAPI's `TestClient` to simulate API requests.
- Use a dedicated test database (usually SQLite or a separate Postgres container) so tests don't wipe local dev data.

## Integration Tests (E2E)

- **Framework**: Playwright (`playwright.config.ts`).
- **Focus**: Testing the entire stack from the browser to the database.
- Critical paths to test: Login flow, writing code, executing code, and viewing results.
- These are slow. Run them in CI or before major releases.

## Regression Tests

Whenever a bug is found in production:
1. Write a test that reproduces the bug (it should fail).
2. Fix the bug.
3. Verify the test passes.
This ensures the bug never returns.

## Manual Testing

Automated tests cannot catch everything, especially visual glitches or subtle UX issues.
- Test in different browsers (Chrome, Safari, Firefox).
- Test responsive layouts (Mobile vs Desktop).
- Test with throttling enabled in DevTools to simulate slow networks.

## Feature Verification

Before marking a feature "Done":
- Have you tested it as a logged-out user?
- Have you tested it as an admin?
- Have you tested invalid inputs?

## Testing Checklist

- [ ] Unit tests written for complex algorithms.
- [ ] API integration tests written for new endpoints.
- [ ] UI tests written for interactive components.
- [ ] E2E tests updated for core user journeys.
- [ ] Code coverage hasn't dropped significantly.
