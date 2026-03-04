## Hilton Restaurant Reservation System

An online table reservation system built for the Hilton Restaurant interview assignment. Guests reserve tables through a SPA; restaurant employees log in to manage those reservations.

---

### Tech Stack & Rationale

| Layer | Technology | Why |
|-------|-----------|-----|
| **Backend framework** | NestJS 11 (TypeScript) | Modular, decorator-driven architecture with first-class GraphQL & REST support |
| **ORM** | Prisma 6 (MongoDB provider) | Type-safe database access, auto-generated client, schema-as-code |
| **Database** | MongoDB 7 (NoSQL) | Requirement specifies NoSQL; document model fits reservations well |
| **Business API** | GraphQL (code-first, Apollo) | Requirement: GraphQL for business services |
| **Auth API** | REST (`/auth/login`) + JWT | Requirement: RESTful endpoints for authentication |
| **Frontend** | SolidJS + TypeScript + Vite | SolidJS is listed as a bonus tech; fine-grained reactivity with no virtual DOM |
| **State management** | RxJS (`BehaviorSubject` for auth, `Subject` for events) | Reactive state across components without pulling in a full Redux store |
| **Styling** | Tailwind CSS 4 | Utility-first CSS for rapid, consistent styling |
| **Testing** | Jest (backend), Vitest (frontend ready) | Standard testing frameworks for each ecosystem |
| **Linting** | ESLint 9 + Prettier (both backend & frontend) | Consistent code style and quality |
| **Containerization** | Docker + docker-compose | One-command reproducible deployment |
| **Package manager** | pnpm | Fast, disk-efficient |

---

### Project Structure

```
hilton/
├── docker-compose.yml          # MongoDB + backend + frontend services
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── .env / .env.example
│   ├── eslint.config.mjs       # ESLint 9 flat config
│   ├── .prettierrc
│   ├── prisma/
│   │   └── schema.prisma       # User, Reservation models, enums
│   ├── src/
│   │   ├── main.ts             # Bootstrap, CORS, validation pipe, exception filter
│   │   ├── app.module.ts       # Root module wiring
│   │   ├── auth/               # REST auth (login controller, JWT strategy, guards)
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   ├── guards/         # JwtAuthGuard, RolesGuard
│   │   │   └── decorators/     # @Roles() decorator
│   │   ├── users/              # User service + admin seeding
│   │   ├── reservations/       # GraphQL resolver + service (CRUD)
│   │   │   ├── reservations.resolver.ts
│   │   │   ├── reservations.service.ts
│   │   │   ├── dto/            # CreateReservationInput, UpdateReservationInput
│   │   │   └── models/         # ReservationModel (GraphQL object type)
│   │   ├── prisma/             # PrismaService + PrismaModule (global)
│   │   └── common/             # AllExceptionsFilter
│   └── test/                   # E2E test config
└── frontend/
    ├── Dockerfile
    ├── eslint.config.mjs       # ESLint 9 flat config
    ├── .prettierrc
    ├── postcss.config.cjs      # Tailwind CSS 4 via @tailwindcss/postcss
    ├── vite.config.ts          # Dev proxy to backend
    └── src/
        ├── index.tsx           # Router (Guest / Login / Employee)
        ├── index.css           # Tailwind import + base styles
        ├── lib/
        │   ├── authStore.ts    # RxJS BehaviorSubject auth state, login/logout
        │   ├── graphqlClient.ts # Shared fetch wrapper with auth headers
        │   └── reservationEvents.ts  # RxJS Subject for reservation events
        └── pages/
            ├── GuestReservationPage.tsx
            ├── LoginPage.tsx
            └── EmployeeDashboardPage.tsx
```

**Architecture decisions:**

- **GraphQL resolver vs REST controller are independently separated.** Business operations (reservations) go through GraphQL; authentication goes through REST. They live in separate NestJS modules.
- **Auth is enforced at the resolver level.** Employee-only operations (`reservations` query, `updateReservationStatus` mutation) are protected with `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('EMPLOYEE')`. Guest operations (create, update, cancel own reservation) are public.
- **Frontend uses RxJS for state management.** Auth state is a `BehaviorSubject` (login status persisted to localStorage); reservation events use a `Subject` stream. Components subscribe and react to changes.

---

### Running the App

**Prerequisites:** Node.js 20+, pnpm, Docker

#### 1. Start MongoDB

```bash
docker compose up -d mongo
```

Initialize replica set (first time only):

```bash
docker exec -it mongofordemo mongosh --eval 'rs.initiate()'
```

#### 2. Backend

```bash
cd backend
pnpm install
npx prisma generate
pnpm start:dev
```

- REST auth: `POST http://localhost:3000/auth/login`
- GraphQL Playground: `http://localhost:3000/graphql`

#### 3. Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

SPA URL: `http://localhost:4173`

#### Full Docker (all services)

```bash
docker compose up --build
```

Then initialize the replica set as shown above. Backend runs on port 3000, frontend on 4173.

---

### User Roles & Auth Flow

| Role | Access | Auth required? |
|------|--------|---------------|
| **Guest** | Create, update, cancel own reservations | No |
| **Employee** | Browse all reservations, update status (approve/cancel/complete) | Yes (JWT) |

1. Employee navigates to `/login` and signs in (`POST /auth/login`)
2. JWT token is stored in localStorage via RxJS `BehaviorSubject`
3. All subsequent GraphQL requests include `Authorization: Bearer <token>`
4. Backend guards validate the token and check the `EMPLOYEE` role

Demo credentials: `admin@example.com` / `password` (auto-seeded on startup)

---

### API Overview

**Auth (REST)**

```
POST /auth/login
Body: { "email": "admin@example.com", "password": "password" }
Response: { "accessToken": "..." }
```

**GraphQL (`/graphql`)**

| Operation | Auth | Description |
|-----------|------|-------------|
| `createReservation(input)` | Public | Guest creates a reservation |
| `updateReservation(id, input)` | Public | Guest updates time/table size |
| `cancelReservation(id)` | Public | Guest cancels |
| `reservation(id)` | Public | Look up a single reservation |
| `reservations(status?, date?)` | Employee | Browse/filter all reservations |
| `updateReservationStatus(id, status)` | Employee | Approve/cancel/complete |

---

### Testing

```bash
cd backend
pnpm test          # unit tests
pnpm test:cov      # with coverage report
```

Test coverage includes:
- **ReservationsService** – create, update, cancel, updateStatus, findAll (with filters), findOne
- **ReservationsResolver** – all queries and mutations
- **AuthService** – login success and failure
- **AuthController** – login endpoint
- **UsersService** – findByEmail, admin seeding
- **AppController** – health check

---

### Non-Tech Requirements

- **Clean code:** TypeScript throughout (both backend and frontend), ESLint + Prettier configured in both packages
- **Logging:** NestJS built-in `Logger` used in bootstrap and the `AllExceptionsFilter`
- **Exception handling:** Global `AllExceptionsFilter` catches all errors, logs full stack server-side, returns safe messages to clients (4xx messages preserved, 5xx sanitized to "Internal server error")

---

### Notes

- MongoDB is accessed exclusively through Prisma (MongoDB provider). No Mongoose dependency.
- Admin user is auto-seeded on backend startup for convenience.
- The frontend Vite dev server proxies `/graphql` and `/api` to the backend at `localhost:3000`.
