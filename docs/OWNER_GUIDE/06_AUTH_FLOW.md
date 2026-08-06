# Authentication Flow

This document outlines the authentication and authorization lifecycle in myEditor.

## Entire Auth Lifecycle

We use an OAuth-first approach (Google, GitHub) combined with JWTs for API authentication.

1. User clicks "Login with Google".
2. Frontend redirects to the backend OAuth endpoint (`/api/auth/google/login`).
3. Backend redirects to the provider.
4. User authenticates and redirects back to `/api/auth/google/callback`.
5. Backend verifies the code, fetches user info, and creates/finds the user in the database.
6. Backend generates an **Access Token** (short-lived, e.g., 15 mins) and a **Refresh Token** (long-lived, e.g., 7 days).
7. Backend sets these tokens as `HttpOnly`, `Secure`, `SameSite=Lax` cookies on the response.
8. Frontend reads user state via `/api/users/me`.

## Cookies

Because tokens are stored in `HttpOnly` cookies, the frontend JavaScript *cannot* read them. This protects against XSS attacks.
When the frontend makes a request to `/api/...`, the browser automatically includes the cookies. Nginx ensures the domains match so CORS/cookie policies allow this.

## Refresh & Access Tokens

- **Access Token**: Contains user identity and roles. Used by FastAPI dependencies to authorize endpoints.
- **Refresh Token**: Used automatically by a backend middleware or a specific endpoint when the Access Token expires. If valid, a new Access Token is issued.

## Guest Mode

Users can use the editor without logging in.
- State is kept in local browser storage (Zustand/localStorage).
- Code execution might be rate-limited heavily for guests.
- Once they log in, guest state can optionally be merged into their persistent account.

## Logout

Logout hits `/api/auth/logout`. The backend responds with `Set-Cookie` headers that clear (expire) both the access and refresh token cookies.

## RBAC (Role-Based Access Control)

Roles are stored on the User model and encoded in the JWT Access Token.

### Owner
- Has full control over the system.
- Can promote other users to Admin.
- Has root-level access to all projects and executions.

### Admin
- Can moderate users.
- Can view system metrics and kill rogue executions.

## Session Lifecycle
A session essentially lasts as long as the Refresh Token is valid. If the refresh token expires or is revoked (changed in the DB), the user is forced to log in again.

## Security Notes
- Never return JWTs in the JSON response body. Always use cookies.
- Ensure `Secure` flag is `True` in production (requires HTTPS).
- Ensure `SameSite=Lax` to protect against CSRF attacks.
- FastAPI endpoints should use `Depends(get_current_user)` to enforce authentication.
