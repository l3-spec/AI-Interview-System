# Repository Guidelines

## Project Structure & Module Organization
The monorepo contains `backend/` (Express + Sequelize API), `backend-api/` (Node workers with Prisma), and `admin-dashboard/` (React + Vite UI). Source lives under each `src/` directory; Jest specs sit alongside services in folders like `src/services/__tests__/`. Frontend assets are under `admin-dashboard/public/`, and shell orchestrators such as `run-all.sh` reside at the repo root.

## Build, Test, and Development Commands
Run `cd backend && npm run dev` for hot reload, or `npm run build && npm start` for production verification. Execute `npm test` in both `backend/` and `backend-api/` to run Jest suites, and `npm run test:interview` before integration releases. For the admin UI, `cd admin-dashboard && npm run dev` starts Vite, while `npm run build && npm run preview` validates bundles.

## Coding Style & Naming Conventions
Use TypeScript/JavaScript with 2-space indentation, semicolons, and named exports when practical. Components follow kebab-case filenames in `admin-dashboard/src/modules`, utilities stay camelCase, and services/controllers remain layered within `backend/src`. Run ESLint for the frontend and Prettier on `backend-api` TypeScript before committing.

## Testing Guidelines
Jest handles unit and integration coverage across `backend/` and `backend-api/`; target ≥80% coverage on interview flows. Name specs descriptively (e.g., `interviewService.test.ts`) and keep them adjacent to source. No default frontend runner—record manual checks or add React Testing Library coverage for critical UI paths.

## Commit & Pull Request Guidelines
Write imperative, descriptive commit messages such as “Add token refresh middleware.” PRs should summarize motivation, highlight affected code paths, document commands run (e.g., `npm test`), and link issues or attach UI screenshots. Call out schema migrations, env variable changes, or new scripts so reviewers can reproduce setups.

## Security & Configuration Tips
Never commit real credentials; duplicate `backend/server/.env.example` or `admin-dashboard/server/airi.env` when introducing variables and document new keys. Use helper scripts like `create-airi-env.sh` and `run-all.sh` to align local environments, and update orchestration scripts if ports or service names change.
