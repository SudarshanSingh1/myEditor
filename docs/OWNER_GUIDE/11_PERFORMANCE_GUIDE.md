# Performance Guide

Performance is a feature. This guide helps you identify and fix bottlenecks.

## How to profile frontend
- Use the **React DevTools Profiler** extension to identify components that are rendering too often or taking too long.
- Use **Lighthouse** in Chrome DevTools to measure initial load time and bundle size.

## How to profile backend
- Use FastAPI's built-in timing middleware (if enabled) or a tool like **Py-Spy** to generate flame graphs of CPU usage.
- In production, monitor APM (Application Performance Monitoring) tools like Sentry or Datadog.

## Slow SQL & N+1 Problem

The most common backend performance killer is the N+1 query problem.

**The Problem**: Fetching 100 projects, and then doing a separate query for each project's owner. (101 queries).
**The Fix**: Use SQLAlchemy's `joinedload` or `selectinload`.
```python
# Bad
projects = db.query(Project).all()
for p in projects:
    print(p.owner.name) # Triggers a DB hit per loop

# Good
projects = db.query(Project).options(joinedload(Project.owner)).all()
```

If a query is slow, run it in `psql` with `EXPLAIN ANALYZE` to see if it's scanning the whole table.

## Indexes
If `EXPLAIN ANALYZE` shows a "Seq Scan" (Sequential Scan) on a large table for a common lookup (e.g., finding a user by email), you need an index.
Add it to the SQLAlchemy model: `email = Column(String, index=True)`. Generate a migration.

## Caching
- **Frontend**: React Query caches API responses automatically. Tune `staleTime` to prevent unnecessary refetches.
- **Backend**: If a database query is complex and the data rarely changes, consider in-memory caching (e.g., Python's `@lru_cache` for configuration) or Redis for shared data.

## React Rendering
- Avoid inline functions and object literals in props if they cause heavy child components to re-render.
- Use Zustand selectors wisely so a component only re-renders when the specific piece of state it needs changes.

## Bundle Optimization
Vite chunks the code automatically, but if the bundle grows too large:
- Use React's `lazy()` to load heavy routes or components (like Monaco editor) only when needed.
- Analyze the bundle using `rollup-plugin-visualizer`.

## Docker Optimization
Our Dockerfiles use multi-stage builds. Ensure you don't install dev-dependencies (like `pytest` or `vitest`) into the final production image, as it bloats the size and attack surface.

## Memory Leaks
- **Frontend**: Ensure event listeners attached in `useEffect` are removed in the cleanup function.
- **Backend**: Python's garbage collector usually handles things, but storing large lists of ORM objects in memory instead of yielding them can cause the container to run out of RAM.

## Websocket Optimization
For the code execution terminal, ensure we aren't sending messages byte-by-byte. Buffer output on the backend and send chunks if the output rate is extremely high.
