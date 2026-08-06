# Frontend Architecture

This document describes how the React frontend is structured and maintained.

## Core Technologies

- **React 19**: Utilizing the latest concurrent features.
- **Vite**: Ultra-fast bundler and dev server.
- **Tailwind CSS 4**: Utility-first CSS framework for styling.

## Routing (React Router 7)

We use React Router 7 for client-side routing.
- Configuration is handled in `react-router.config.ts` and `app/routes.ts`.
- Routes map URL paths to components in the `app/routes/` or `app/pages/` directory.

## Query (React Query)

Server state (data fetched from the API) is managed EXCLUSIVELY by `@tanstack/react-query`.
- **Do not** use `useEffect` and `useState` to fetch data.
- **Do** create custom hooks in `app/hooks/` that wrap `useQuery` or `useMutation`.
- React Query handles caching, deduplication, background updates, and loading states automatically.

## Stores (Zustand)

Client state (UI state, current editor theme, selected file) is managed by `zustand`.
- Stores live in `app/stores/`.
- Keep stores small and focused (e.g., `useEditorStore`, `useAuthStore`).
- Never store server data in Zustand if React Query can handle it.

## Components

Located in `app/components/`.
We follow a composition-based approach.
- Use `clsx` and `tailwind-merge` for dynamic class names.
- Keep components pure. They should receive data via props and emit actions via callbacks (`onAction`).

## Feature Organization

Instead of grouping by file type, consider grouping by feature if the app grows large.
Currently, files are grouped by type (components, hooks, pages). 

## Where new components belong

- **Generic/Reusable**: `app/components/ui/` (e.g., Button, Modal, Input).
- **Feature Specific**: `app/components/<feature>/` (e.g., `app/components/editor/MonacoWrapper.tsx`).

## State Management Rules

1. **Local State (`useState`)**: Use for simple component-level state (e.g., "is this specific dropdown open?").
2. **Client Global State (`Zustand`)**: Use for UI state that affects multiple components (e.g., dark mode, sidebar collapsed).
3. **Server State (`React Query`)**: Use for EVERYTHING that comes from the backend database.

## Performance Rules

1. **Memoization**: Only use `React.memo`, `useMemo`, and `useCallback` when a performance issue is identified, or when passing props to heavy components like Monaco Editor.
2. **Code Splitting**: React Router 7 handles lazy loading routes. Ensure large dependencies (like Monaco Editor) are dynamically imported if they aren't needed on the initial page load.
3. **Re-renders**: Keep Zustand selectors specific. `const theme = useEditorStore(state => state.theme)` prevents re-renders when other state changes.
