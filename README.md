# LedgerMind AI

LedgerMind AI helps small businesses review supplier invoice data before sending approved vouchers to Tally. This checkout contains Phase 1A authentication and supplier management. The [approved blueprint](PROJECT_BLUEPRINT.md) defines the MVP.

## Start on Windows

Start Docker Desktop in Linux container mode. For host-side checks, use Node.js 24.14.0, pnpm 10.33.0, and Python 3.13.12. Run the commands from the repository root in PowerShell.

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose --env-file .env -f infra/docker-compose.yml up --build --wait --wait-timeout 180
docker compose --env-file .env -f infra/docker-compose.yml ps -a
```

Compose starts PostgreSQL, Redis, Next.js, Express, and FastAPI. The one-shot `migrate` service applies migrations before Express starts. Its expected final state is `Exited (0)`. If you change the local PostgreSQL credentials, update `DATABASE_URL` to match. An existing PostgreSQL volume retains its original credentials.

| Check | Address or command |
| --- | --- |
| Frontend | http://127.0.0.1:3000/ |
| Frontend liveness | http://127.0.0.1:3000/api/health |
| API liveness | http://127.0.0.1:3001/health |
| API database readiness | http://127.0.0.1:3001/ready |
| FastAPI liveness | `http://ai-service:8000/health` inside Compose |
| PostgreSQL and Redis | Check their healthy status in Compose |

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/health
Invoke-RestMethod http://127.0.0.1:3001/health
Invoke-RestMethod http://127.0.0.1:3001/ready
docker compose --env-file .env -f infra/docker-compose.yml exec -T ai-service python -c "from urllib.request import urlopen; print(urlopen('http://127.0.0.1:8000/health').read().decode())"
docker compose --env-file .env -f infra/docker-compose.yml exec -T postgres pg_isready -U ledgermind -d ledgermind
docker compose --env-file .env -f infra/docker-compose.yml exec -T redis redis-cli ping
docker compose --env-file .env -f infra/docker-compose.yml run --rm migrate pnpm --filter @ledgermind/database validate
docker compose --env-file .env -f infra/docker-compose.yml run --rm migrate pnpm --filter @ledgermind/database migrate:status
```

FastAPI, PostgreSQL, and Redis have no published host ports. The web and API ports are bound to localhost. `API_BASE_URL` connects Next.js to Express. `AI_SERVICE_URL` and `REDIS_URL` reserve internal addresses for later phases. Phase 1A requires no Gemini key, Tally installation, or cloud account.

Stop the services and keep the PostgreSQL volume.

```powershell
docker compose --env-file .env -f infra/docker-compose.yml down
```

## Sign in and manage suppliers

Create your first account after Compose reports that migrations have completed. In PowerShell, enter a password of at least 12 characters at the hidden prompt. Run the same block with an unused email and `OPERATOR` in place of `ADMIN` to create a read-only account.

```powershell
$oldEncoding = $OutputEncoding
try {
    $OutputEncoding = [Text.UTF8Encoding]::new($false)
    $password = Read-Host "Password for admin@example.test" -AsSecureString
    [Net.NetworkCredential]::new("", $password).Password |
        docker compose --env-file .env -f infra/docker-compose.yml exec -T api pnpm --filter @ledgermind/api user:create admin@example.test ADMIN
} finally {
    $OutputEncoding = $oldEncoding
}
```

1. Open `http://127.0.0.1:3000/login`, substituting your `WEB_PORT` if configured. Sign in with the account you created.
2. As an ADMIN, add a supplier by entering a name and Tally ledger name. Optionally enter a tax ID. Use **Edit** to change the mapping or set its status to inactive.
3. Sign out and sign in as an OPERATOR. Confirm you can view supplier records and that the write controls are absent.
4. Sign out and revisit `/suppliers`. The app sends you to the login screen.

The browser calls `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, and `/api/suppliers` through Next.js. Express checks the session and role on business requests. Write requests must supply the configured origin. Compose defaults `APP_ORIGIN` to `http://127.0.0.1:<WEB_PORT>`. If you use a different hostname or HTTPS, set `APP_ORIGIN` to the exact origin in `.env` and restart Compose. Use HTTPS outside loopback development.

Sessions expire after eight hours. Logout revokes the session in PostgreSQL. The API stores password hashes and session token digests.


## Run development checks

```powershell
pnpm.cmd install --frozen-lockfile --store-dir .pnpm-store
pnpm.cmd db:generate
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd build

python -m venv .venv
Push-Location apps/ai-service
try {
    $phasePython = "..\..\.venv\Scripts\python.exe"
    & $phasePython -m pip install -r requirements-dev.txt
    & $phasePython -m ruff check .
    & $phasePython -m mypy main.py tests
    & $phasePython -m pytest
} finally {
    Pop-Location
}
```

With the Compose stack running, install Chromium and run the browser smoke test.

```powershell
pnpm.cmd --filter @ledgermind/web exec playwright install chromium
pnpm.cmd --filter @ledgermind/web test:e2e
```

### Database and browser tests

Run the database-backed integration suite in the running API container. It creates uniquely named test rows and removes its fixtures at the end.

```powershell
docker compose --env-file .env -f infra/docker-compose.yml exec -T -e RUN_DB_TESTS=1 api pnpm --filter @ledgermind/api test
```

To include the supplier workflow in Playwright, set `PLAYWRIGHT_ADMIN_EMAIL` and `PLAYWRIGHT_ADMIN_PASSWORD` for a dedicated test account. The browser test creates and deactivates a supplier record in the configured database, so run it against test data. A unique name is generated unless `PLAYWRIGHT_SUPPLIER_NAME` is set. Use `PLAYWRIGHT_BASE_URL` if your web port differs from 3000.


If Compose startup fails, inspect the affected container with `docker compose --env-file .env -f infra/docker-compose.yml logs`. Check that Docker Desktop is using its Linux engine. If a port is busy, set `WEB_PORT` or `API_PORT` in `.env` and use the selected port in the URLs above. Before the browser smoke test, set `$env:PLAYWRIGHT_BASE_URL` to the frontend URL if you changed `WEB_PORT`.
