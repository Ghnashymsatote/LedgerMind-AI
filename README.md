# LedgerMind AI

LedgerMind AI helps small businesses review supplier invoice data before sending approved vouchers to Tally. This checkout includes authentication, supplier management, invoice intake, and Phase 2 AI-assisted invoice extraction and correction. The [approved blueprint](PROJECT_BLUEPRINT.md) defines the MVP.

## Start on Windows

Install Git and Docker Desktop on the new PC, then start Docker Desktop in Linux container mode. Clone the repo and run [setup.ps1](setup.ps1) from PowerShell.

```powershell
git clone https://github.com/Ghnashymsatote/LedgerMind-AI.git
Set-Location LedgerMind-AI
powershell -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1 -AdminEmail admin@example.test
```

The script creates `.env` on the first run, builds and starts Compose, waits for health checks and migrations, and prints the login URL. With `-AdminEmail`, it prompts for a password and creates the first ADMIN. Omit that option when restarting with an existing account. A clone copies the source code. Users and invoices live in Docker volumes on the PC where they were created, so the new PC starts with an empty database.

Docker handles the app runtimes for startup. For host-side checks, use Node.js 24.14.0, pnpm 10.33.0, and Python 3.13.12. To start Compose manually, run the following from the repository root in PowerShell.

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

FastAPI, PostgreSQL, and Redis have no published host ports. The web and API ports are bound to localhost. `API_BASE_URL` connects Next.js to Express. `AI_SERVICE_URL` and `REDIS_URL` reserve internal addresses for later phases. Local invoice intake requires no Gemini key, Tally installation, or cloud account.

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


## Upload and verify an invoice

1. Start or rebuild the stack using the PowerShell commands above. Compose applies the invoice migration before starting the API.
2. Sign in and use **Suppliers** to add a supplier as an ADMIN. Both ADMIN and OPERATOR accounts can use **Invoices → Upload invoice**.
3. Select a supplier and a PDF, PNG, or JPEG. The default limit is 10 MiB (10,485,760 bytes). Set `INVOICE_MAX_FILE_BYTES` in `.env` and recreate the web and API services to use a different limit. The supported configuration range is 1 byte through 50 MiB.
4. After upload, check the `UPLOADED` status, uploader, supplier, file size, and timestamp. Use **View file** or **Download file**.
5. Return to **Invoices** and search by file or supplier name. You can also filter by supplier and status and navigate through result pages.
6. Try uploading a text file renamed to `.pdf` or a file larger than the limit. Sign out and revisit the invoice detail or file URL to verify access is blocked.

After upload, Express sends the private PDF/JPEG/PNG bytes to FastAPI. The default deterministic mock provider does not read or invent document values: it supplies trusted context, flags the invoice for review, and lets the operator enter GST and financial fields while viewing the original document. Corrections include supplier/buyer GSTIN, invoice identity, HSN/SAC line items, taxable amounts, tax rates, CGST, SGST, IGST, total tax, and invoice total. Values are validated and stored as PostgreSQL decimals.

The default configuration requires no AI key:

```dotenv
EXTRACTION_PROVIDER=mock
EXTRACTION_TIMEOUT_MS=30000
GEMINI_MODEL=gemini-2.5-flash
```

To test Gemini later, set `EXTRACTION_PROVIDER=gemini` and put `GEMINI_API_KEY` only in the local `.env` or a deployment secret store, then recreate `ai-service` and `api`. Never commit the key. Gemini output remains a proposal: missing or unclear values are null and must be reviewed. A failed or timed-out request changes the invoice to `EXTRACTION_FAILED`; use **Retry extraction** after restoring the service. Successful extractions cannot be retried, preventing accidental duplicate requests.

The API keeps files in the private `invoice-files` Docker volume at `/var/lib/ledgermind/invoices`. PostgreSQL stores metadata and a random storage key. The API detects the file format from its bytes and uses the detected format for the displayed extension and response type. The normal Compose `down` command retains both data volumes. For API development outside Compose, set `INVOICE_STORAGE_DIR` to a private directory. The default is the ignored project-root `.invoice-files` directory when started through the API package scripts.

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

To include the supplier workflow in Playwright, set `PLAYWRIGHT_ADMIN_EMAIL` and `PLAYWRIGHT_ADMIN_PASSWORD` for a dedicated test account. The browser test creates and deactivates a supplier record in the configured database, so run it against test data. A unique name is generated unless `PLAYWRIGHT_SUPPLIER_NAME` is set. To run the operator and invoice workflows, also set `PLAYWRIGHT_OPERATOR_EMAIL` and `PLAYWRIGHT_OPERATOR_PASSWORD`. The invoice test creates a supplier and uploads a sample file. Use a disposable test database and invoice volume for browser tests. Use `PLAYWRIGHT_BASE_URL` if your web port differs from 3000.


If Compose startup fails, inspect the affected container with `docker compose --env-file .env -f infra/docker-compose.yml logs`. Check that Docker Desktop is using its Linux engine. If a port is busy, set `WEB_PORT` or `API_PORT` in `.env` and use the selected port in the URLs above. Before the browser smoke test, set `$env:PLAYWRIGHT_BASE_URL` to the frontend URL if you changed `WEB_PORT`.
