# Job Application Filler (JFP)

A monorepo for managing job applications with a backend API.

## Backend (`apps/backend`)

Express 5 REST API with JWT authentication and PostgreSQL.

### Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express 5
- **Database**: PostgreSQL + TypeORM
- **Auth**: JWT (HttpOnly cookies) + bcrypt
- **Validation**: Zod

### API Endpoints

| Method | Endpoint           | Auth | Description           |
| ------ | ------------------ | ---- | --------------------- |
| POST   | `/api/user`        | ❌   | Register              |
| POST   | `/api/user/login`  | ❌   | Login                 |
| POST   | `/api/user/logout` | ✅   | Logout                |
| PUT    | `/api/user`        | ✅   | Update profile        |
| DELETE | `/api/user`        | ✅   | Delete account        |
| POST   | `/api/job`         | ✅   | Create job            |
| PUT    | `/api/job`         | ✅   | Update job            |
| DELETE | `/api/job`         | ✅   | Delete job            |
| GET    | `/api/job`         | ✅   | List jobs (paginated) |

### Scripts

```bash
cd apps/backend
npm run dev          # Start dev server
npm test             # Run tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

### Environment Variables

```env
NODE_PORT=8000
NODE_ENV=development
NODE_DATABASE_CONFIG='{"host":"","username":"","password":"","database":"","port":5432}'
NODE_CORS_ORIGIN=http://localhost:3000
NODE_JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
NODE_JWT_EXPIRES_IN=7d
NODE_RATE_LIMIT_MAX=100
```

### What I Have Learned in This Process

#### 🛠️ Setup

- Evaluated which **package workspace** manager is the best fit — and whether to use **Turbo** or not.
- Learned about **pre-commit hooks** and **commit syntax managers** (e.g., Commitlint).
- Pre-commit hooks help catch **ESLint issues** before code is committed.

#### 📘 TypeScript

- Initially confusing on where to keep the types vs. **Zod** schema types.
- **Zod** and **TypeORM** documentation are great resources.

#### ⚙️ Middleware

- Used **Pino** for logging — it's great for structured log management (replaced plain `console.log`).
- Explored **rate limiting** and **Helmet** middleware for security.

#### 🔐 Authentication

- Learned about the explicit need to specify the **JWT algorithm**.
- Still looking into ways to improve the authentication flow.

#### 🌐 REST API

- Following correct **REST naming conventions** for endpoints.
- Moved input validation to **Zod** — no unnecessary `try/catch` blocks since **Express 5** handles async errors natively.
- Only using `try/catch` for returning **specific error messages** to the frontend.

#### 🧪 Vitest

- Similar to **Jest** — revised how to **mock** different functions, files, and modules.
