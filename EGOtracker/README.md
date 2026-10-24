# EGOtracker

A small, full-stack expense tracker and a hands-on path through Git, GitHub, GitHub Actions, DevSecOps, networking, Prisma ORM, and AWS.

## What you will build and learn

- **Frontend:** plain HTML, CSS, and browser JavaScript; no frontend framework or build step.
- **API:** Node.js and Express, with JSON validation and clear HTTP responses.
- **Security defaults:** Helmet response headers, a same-origin content security policy, bounded JSON input, and parameterized Prisma queries.
- **Database:** Prisma ORM with SQLite for a zero-setup local database. Amounts are stored as integer cents to avoid floating-point money errors.
- **CI:** GitHub Actions validates the Prisma schema, runs API tests, and checks dependency advisories.
- **AWS:** a staged path from a local app to a cloud-hosted frontend, API, and managed database. Deployment is intentionally not automated until you create and understand the AWS resources.

## Run locally

Requirements: Node.js 20.6 or later and npm.

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run db:migrate -- --name init
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000). Add a transaction, change the month or category filter, and delete a transaction to explore the full CRUD flow. Run `npm test` in another terminal to exercise the API.

If PowerShell blocks the `npm` script, use `npm.cmd` as shown above.

To inspect the database visually, run `npm run db:studio`.

## Project map

```text
EGOtracker/
├── .github/workflows/ci.yml  # Continuous integration and dependency audit
├── prisma/schema.prisma      # Database model and SQLite connection
├── public/                   # Vanilla HTML, CSS, and browser JavaScript
├── src/app.js                # Express routes and input validation
├── src/server.js             # HTTP server and Prisma lifecycle
└── tests/app.test.js         # API tests using Node's built-in test runner
```

## Learning path

### 1. Understand the application and networking

1. Start the server and open the browser's developer tools.
2. Submit an expense and inspect the `POST /api/expenses` request in the Network tab.
3. Follow the request: browser `fetch` → HTTP method/path/JSON → Express route → Prisma Client → SQLite → JSON response.
4. Try an invalid amount and inspect the `400` status and error response. Try an unknown API path and inspect `404`.
5. Learn the local loopback address (`127.0.0.1`), ports, DNS, HTTP headers, JSON, and the difference between `http` and TLS-protected `https`.

### 2. Learn Prisma ORM

1. Read `prisma/schema.prisma`. `Expense` is a Prisma model; its fields map to database columns.
2. Change a field (for example, add a `paymentMethod String?` field).
3. Run `npm run db:migrate -- --name add-payment-method` and inspect the generated migration under `prisma/migrations/`.
4. Find `prisma.expense.findMany`, `.create`, and `.deleteMany` in `src/app.js`. These are Prisma Client queries, not handwritten SQL.
5. Use `npm run db:studio` to view records. Keep migrations in Git so every environment can reproduce the schema.

### 3. Learn Git and GitHub

From inside this project directory:

```bash
git status
git switch -c feat/egotracker-improvement
git add EGOtracker/
git commit -m "Improve EGOtracker"
git push -u origin feat/egotracker-improvement
```

These commands run from the root of the existing `fireship` repository, where this app lives in the `EGOtracker/` subfolder. Make one small change, inspect the diff, push your feature branch, and open a pull request:

```bash
git status
git add EGOtracker/prisma/schema.prisma
git commit -m "Add expense payment method"
git push
```

Review the pull request and its Actions checks before merging. Never commit `.env`, access keys, database files, or other credentials.

### 4. Learn GitHub Actions and DevSecOps

`.github/workflows/ci.yml` runs for pushes and pull requests to `main` and `master`, and can also be started manually from the Actions tab. It:

- installs the exact locked dependency versions with `npm ci`;
- checks the Prisma schema;
- runs API tests;
- fails when npm reports high-severity dependency vulnerabilities.

Try making a test fail and push a branch to observe a red check. Fix the test and observe the green check. For additional DevSecOps practice, add secret scanning and static analysis in GitHub repository settings, review Dependabot alerts, and require successful checks before merging. CI checks are not a substitute for reviewing code or protecting secrets.

### 5. Prepare a safe AWS deployment

Do not deploy this SQLite configuration unchanged to a serverless or multi-instance production service: a local SQLite file is not a shared, durable database in that setup.

Suggested learning stages:

1. Learn AWS regions, IAM roles, VPCs, subnets, security groups, DNS, TLS certificates, and least privilege. Prefer temporary role-based credentials; do not put AWS keys in the repository.
2. Build and serve the static frontend from S3 through CloudFront, with HTTPS and a custom domain when ready.
3. Convert the Prisma provider and migration strategy from SQLite to PostgreSQL. Use a managed PostgreSQL database such as RDS, keep it private in a VPC, and store the connection string in AWS Secrets Manager.
4. Deploy the Node API as a container to AWS App Runner or ECS. Configure its runtime environment with the database secret and allow only the required network path to the database.
5. Route the CloudFront `/api/*` behavior to the API origin so the frontend and API remain same-origin under the Content Security Policy. Add health checks, logs, backups, and cost alerts, and run migrations as a deliberate release step.
6. Add a protected GitHub Actions deployment job only after the manual process is understood. Use GitHub OIDC to assume a narrowly scoped AWS IAM role instead of long-lived AWS access keys.

The local app is intentionally runnable without an AWS account. Cloud deployment needs an AWS account, billing awareness, a chosen hosting target, and carefully configured IAM/network resources.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check that the app is responding |
| `GET` | `/api/expenses` | List expenses; optional `month=YYYY-MM` and `category` filters |
| `POST` | `/api/expenses` | Add an expense with `title`, `amount`, `category`, `date`, and optional `notes` |
| `DELETE` | `/api/expenses/:id` | Remove one expense |

## Useful commands

```bash
npm run dev                 # Start the app in watch mode
npm test                    # Run API tests
npm run prisma:validate     # Validate the Prisma schema
npm run prisma:generate     # Generate Prisma Client
npm run db:migrate -- --name describe-change
npm run db:studio           # Open Prisma Studio
npm audit --audit-level=high
```
