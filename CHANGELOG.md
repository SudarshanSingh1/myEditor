# CHANGELOG

## v1.0.0-rc1 (Release Candidate 1)

### Added
- Feedback Modal for user bug reports and feature requests.
- System Error telemetry capturing crashes, stack traces, browser info, and routes.
- Admin Dashboard tabs for System Settings, User Feedback, and System Errors.
- `health`, `version`, and `status` API endpoints for system monitoring.
- `About` page with technology stack information.

### Changed
- Integrated global error boundaries with automatic backend crash reporting.
- Enhanced Admin Settings panel.

### Fixed
- Stabilized database migrations (resolved duplicate keys in `file_versions`).
- Eliminated console errors and React runtime errors.
- Improved error handling in `api.ts`.
