# 🤝 Contributing to Hamara Editor

First off, thank you for considering contributing to **Hamara Editor**! It's people like you that make open-source web IDEs secure, fast, and accessible to developers around the world.

Whether you want to add support for a new programming language runner, fix a UI bug, improve documentation, or enhance our Docker security sandbox, we welcome your contributions!

---

## 📋 Table of Contents
1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards & Style Guide](#coding-standards--style-guide)
5. [Pull Request Process](#pull-request-process)
6. [Reporting Bugs & Suggesting Features](#reporting-bugs--suggesting-features)

---

## 🌟 Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free experience for everyone. When interacting in issues, pull requests, or community discussions, please:
- Be respectful, empathetic, and constructive in feedback.
- Focus on what is best for the community and project security.
- Accept constructive criticism gracefully.

---

## 🚀 Getting Started

To get your local development environment set up:
1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/<your-username>/myEditor.git
   cd myEditor
   ```
3. Follow the detailed setup instructions in our **[Developer & Contributor Guide](docs/DEVELOPING.md)** to configure Vite (React 19), FastAPI (Python 3.13), and PostgreSQL.

---

## 🔄 Development Workflow

### 1. Create a Branch
Never commit directly to the `main` branch. Always create a descriptive feature or bugfix branch from `main`:
```bash
git checkout -b feat/add-rust-runner
# or
git checkout -b fix/monaco-tab-switch-bug
# or
git checkout -b docs/update-nginx-ssl-guide
```

### 2. Make Your Changes
- Keep your changes focused and atomic. Avoid mixing formatting cleanups with core logic changes in the same PR.
- If adding a new feature or API endpoint, please include corresponding pytest unit tests in `backend/tests/`.

### 3. Test & Verify Locally
Before committing, ensure that all linters and unit tests pass cleanly:

```bash
# 1. Frontend Checks (Root Directory)
npm run typecheck
npm run lint

# 2. Backend Checks (in /backend directory with venv active)
ruff check .
pytest tests/api/ -v
```

---

## 🎨 Coding Standards & Style Guide

### TypeScript & React (Frontend)
- Use **TypeScript** for all new components and utilities. Avoid using `any`; define strict interface types in `app/types/`.
- Use **functional components** with React Hooks.
- Style components using **Tailwind CSS** utility classes and our `cn()` utility mixer for conditional styling.
- Ensure proper accessibility (ARIA labels, keyboard navigation in Monaco editor and file tree).

### Python & FastAPI (Backend)
- Target **Python 3.13** syntax and type hinting (e.g., `list[str]` instead of `List[str]`).
- Follow **PEP 8** style guidelines enforced by `ruff`.
- Use **Pydantic v2 schemas** for all FastAPI request bodies and response serializations.
- All database modifications must be accompanied by an **Alembic migration script** (`alembic revision --autogenerate -m "description"`). Never modify database tables without a migration!

---

## 📤 Pull Request Process

1. Push your branch to your GitHub fork:
   ```bash
   git push -u origin feat/your-feature-name
   ```
2. Open a Pull Request against our repository's `main` branch.
3. Use a clear, descriptive title following conventional commit naming:
   - `feat(sandbox): add Go compilation runner container`
   - `fix(admin): resolve 500 error on security dashboard`
   - `docs(readme): add docker compose quick start table`
4. In the PR description, summarize the problem solved, attach UI screenshots (if applicable), and list the commands you ran to verify the fix.
5. Our automated CI/CD GitHub Actions pipeline will automatically run linting and unit tests against your PR. Ensure the CI checks pass!
6. A project maintainer will review your code and provide feedback or merge your PR.

---

## 🐛 Reporting Bugs & Suggesting Features

If you encounter a bug or have a feature idea, please open a GitHub Issue!
- **Bug Reports:** Include your OS, Docker version, browser version, steps to reproduce, and any terminal/console error logs.
- **Security Vulnerabilities:** If you discover a potential sandbox escape or security vulnerability, please **do not** open a public issue. Email the maintainers directly or use GitHub Security Advisories so we can patch it responsibly.
