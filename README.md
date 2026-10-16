# Credit Warrior

Full-stack application for managing shared credit card expenses, billing cycles, dynamic installment schedules (*on-the-fly*), and person-based expense splitting with strict monetary precision.

## Project Structure

This monorepo consists of two primary applications:

- **[`api-credit-warrior/`](./api-credit-warrior)**: Backend REST API built with Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, and PostgreSQL. Handles financial rules, amortization projections, maintenance fee proration, and query optimizations.
- **[`web-credit-warrior/`](./web-credit-warrior)**: Frontend client built with Next.js (App Router), React, TypeScript, and Tailwind CSS.

## Getting Started

### Backend (`api-credit-warrior`)
1. Create and activate a Python 3.12+ virtual environment.
2. Install dependencies: `pip install -e ".[dev]"`
3. Configure `.env` from `.env.example`.
4. Run migrations: `alembic upgrade head`
5. Start dev server: `uvicorn app.main:app --reload`

### Frontend (`web-credit-warrior`)
1. Install dependencies: `npm install`
2. Configure `.env.local` from `.env.example`.
3. Start dev server: `npm run dev`

## Architecture & Specifications

Refer to the internal system specifications and architecture constitution in:
- `api-credit-warrior/docs/constitution.md`
- `api-credit-warrior/specs/`
- `web-credit-warrior/specs/`
