# LedgerMind AI

Project Definition & Implementation Blueprint \| Version 1.0 \| 22 November 2026

Status: Agreed project direction; implementation has not started. This document is the baseline scope for development in VS Code.

## 1. Executive summary

LedgerMind AI is an AI-assisted invoice processing and Tally synchronization platform for small businesses that already use Tally for accounting. It helps users upload supplier invoices, extract invoice fields, review and approve the data, and send approved voucher information to Tally through a traceable background sync workflow. It complements Tally; it is not a replacement accounting ERP.

## 2. The business problem and product purpose

Businesses receive invoices as PDFs or images and often retype supplier, invoice, tax and amount information. Errors, duplicates, unclear approval status, and failed integrations create extra verification work. The product aims to reduce re-entry, keep a human review step, and make sync outcomes visible and recoverable.

Primary purpose: Convert supplier invoice documents into verified, auditable, Tally-ready records with reliable synchronization.

Target users: Small-business accounting staff and operators, with an admin managing suppliers and integration settings. This is a portfolio prototype, not a certified accounting or tax-compliance product.

## 3. Value proposition and success criteria

- Reduce repetitive typing: extracted fields prefill a review form; users correct and approve.
- Prevent accidental duplicates: check supplier + invoice number and relevant document fingerprints.
- Make integration dependable: track each attempt, show failures, and retry safely without duplicate posting.
- Maintain control: no AI-generated financial transaction is posted without deterministic validation and explicit approval.
- Demonstrate value with tests: measure extraction field accuracy, review time, and duplicate/retry outcomes using sample invoices.

## 4. Confirmed scope: MVP

| Area | What we will build |
| --- | --- |
| Invoice intake | Upload PDF/image; store original; create invoice draft and processing status. |
| AI extraction | FastAPI + Gemini extracts structured supplier, invoice number/date, line items, subtotal, tax, total; Pydantic schema and confidence/uncertainty flags where supported. |
| Human review | Side-by-side document preview and editable fields; approval required before sync. |
| Validation | Server-side arithmetic, required fields, duplicate checks, supplier matching and safe status transitions. |
| Supplier mapping | Supplier master and mapping to Tally ledger name/identifier. |
| Sync engine | Generate deterministic Tally-compatible voucher payload; queue sync job; record attempts, errors, retries and outcomes. |
| Mock Tally | Local simulator with success, failure and timeout scenarios for end-to-end demo. |
| Dashboard | Counts, invoice statuses, sync status, and recent activity. |
| Basic access control | Simple login and admin/operator permissions; server-side enforcement. |
| Testing | Unit, integration and end-to-end tests for the critical workflow. |

## 5. Explicitly out of scope for MVP

Full general ledger, bank reconciliation, payroll, GST return filing, e-invoicing certification, multi-company enterprise accounting, automated tax advice, autonomous financial posting, two-way Tally synchronization, Kafka, multi-agent systems, long-term AI memory and a full RAG assistant. These are future options, not launch requirements.

## 6. Main screens (six MVP screens)

| Screen | User action / key content |
| --- | --- |
| 1. Dashboard | KPIs: drafts, pending approval, approved, synced, failed; recent invoices. |
| 2. Invoice list | Search/filter invoices; status and supplier; open detail. |
| 3. Upload invoice | Choose file; show processing state and validation errors. |
| 4. Invoice review | Document preview, extracted editable fields, totals, warnings, approve/reject. |
| 5. Suppliers & mappings | Create supplier and maintain Tally ledger mapping. |
| 6. Sync monitor | Queue status, attempts, error details, safe manual retry. |

Settings and a read-only AI assistant may be added as later screens. Authentication can be a dedicated login route and is not counted as a core business screen.

## 7. Confirmed technology stack

| Layer | Technology | Reason |
| --- | --- | --- |
| Frontend | Next.js, React, TypeScript | Modern dashboard, forms and routing. |
| UI | Tailwind CSS, shadcn/ui | Accessible, reusable UI components. |
| API | Node.js, Express, TypeScript | Business workflows, authorization, validation. |
| Database | PostgreSQL + Prisma | Relational data, constraints, transactions and migrations. |
| API validation | Zod | Typed request and response validation. |
| AI service | Python, FastAPI, Pydantic | Separate extraction service with strict output schema. |
| LLM | Gemini free-tier API where eligible | Structured invoice field extraction; quota-dependent. |
| AI orchestration | LangChain (when needed) | Prompt/model composition; not required for initial proof of concept. |
| Queue | Redis + BullMQ | Asynchronous processing, retry/backoff, job visibility. |
| Tally integration | Custom XML/HTTP adapter + local simulator | Test integration without licensed Tally. |
| Storage | Local files in dev; optional S3 | Store uploaded source documents. |
| Containers | Docker Compose | Reproducible local multi-service setup. |
| Testing | Vitest, pytest, Playwright | Business logic, extraction contracts and E2E flow. |
| CI | GitHub Actions | Lint, type-check, tests and builds. |
| Proxy/deploy | Caddy or Nginx; optional AWS EC2 | HTTPS and deployment learning. |

## 8. Future learning extensions (not MVP commitments)

| Feature | Technology | Trigger to add |
| --- | --- | --- |
| Document Q&A | RAG, embeddings, pgvector | When users need source-grounded answers from invoices/contracts. |
| AI tools | MCP | When assistant needs standardized read-only business tools. |
| Multi-step AI | LangGraph | When workflow complexity justifies orchestration. |
| Event streaming | Kafka | When event fan-out and consumers justify infrastructure. |
| Observability | OpenTelemetry | When tracing across services is needed. |
| Managed cloud | AWS S3/ECR/CloudWatch/RDS | When deployment requirements and budget permit. |

## 9. High-level architecture

Browser (Next.js) -\> Express API -\> PostgreSQL (Prisma). Express requests AI extraction from FastAPI/Gemini; uploaded file is stored locally for development. Express enqueues approved sync requests in BullMQ/Redis. A Node worker maps the approved invoice into a Tally-compatible voucher, sends it to the mock Tally adapter, and writes attempt/outcome records to PostgreSQL. A real Tally adapter can replace the mock after verified testing.

Architecture principle: Express owns business state and approval; FastAPI only proposes extracted data; worker owns external sync. The LLM never directly modifies ledger balances or submits vouchers.

## 10. Data model (initial entities)

| Entity | Representative fields |
| --- | --- |
| User | id, email, passwordHash, role, createdAt |
| Supplier | id, name, taxId optional, tallyLedgerName, status |
| Invoice | id, supplierId, invoiceNumber, invoiceDate, currency, subtotal, tax, total, status, sourceFilePath, version |
| InvoiceLine | id, invoiceId, description, quantity, unitPrice, amount, taxRate |
| ExtractionRun | id, invoiceId, model, rawOutputRef, extractedJson, warnings, status, createdAt |
| Approval | id, invoiceId, actorId, approvedAt, invoiceVersion |
| SyncJob | id, invoiceId, idempotencyKey, status, attempts, lastError, externalVoucherRef |
| SyncAttempt | id, syncJobId, attemptNo, requestRef, responseRef, outcome, timestamp |
| AuditEvent | id, actorId, entityType, entityId, action, timestamp, details |

Use integer minor currency units or a fixed-precision decimal policy consistently; never JavaScript floating-point for financial calculations. Add uniqueness constraints and explicit lifecycle transitions.

## 11. Invoice workflow and states

Upload -\> PROCESSING -\> NEEDS\_REVIEW -\> APPROVED -\> QUEUED -\> SYNCING -\> SYNCED. Failure paths: EXTRACTION\_FAILED, REJECTED, SYNC\_FAILED; retries return a failed sync to QUEUED without duplicating approved business data. A corrected invoice must be reapproved if material fields change.

Example: Upload invoice INV-1024 for ₹11,800; AI suggests supplier, line items, subtotal ₹10,000 and tax ₹1,800; server checks total; operator approves; worker sends one voucher to simulator; UI shows SYNCED with an audit trail.

## 12. Tally integration: exact boundary

MVP supports one-way supplier purchase invoice/voucher export only, using a configurable mapping. The connector produces XML/HTTP requests consistent with the selected Tally interface contract, but compatibility must be verified against a real configured TallyPrime instance before any live-integration claim. A mock endpoint can simulate responses, timeouts and duplicate submissions.

- Create a stable idempotency key from approved invoice identity/version; keep one logical sync job per approved version.
- Store outbound request reference and response status; do not mark SYNCED based solely on network request completion.
- Handle uncertain outcomes: after timeout, check remote state if supported or mark for reconciliation rather than blindly resending.
- Never store passwords, API keys or sensitive invoice content in plaintext logs.

## 13. AI behavior, safety and evaluation

AI only extracts and explains information. It cannot approve, post or silently modify accounting records. The backend checks required fields, totals, supplier identity and duplicate indicators. Uncertain extraction is shown for human review; source documents remain available for comparison.

Evaluation set: start with 20-30 representative sample invoices with manually labeled ground truth; measure field-level exact match/normalized match for invoice number, date, supplier and totals; log extraction failures and average review time. Do not claim accuracy or time savings until measured.

## 14. API outline (draft contracts)

| Endpoint | Purpose |
| --- | --- |
| POST /auth/login | Create authenticated session. |
| POST /invoices/upload | Upload document and create draft. |
| GET /invoices | List and filter invoices. |
| GET /invoices/:id | Details, extraction, source preview and status. |
| PATCH /invoices/:id | Correct extracted fields with version check. |
| POST /invoices/:id/approve | Validate and approve invoice. |
| GET /suppliers | List supplier mappings. |
| POST /suppliers | Create supplier. |
| GET /sync-jobs | List sync status and attempts. |
| POST /sync-jobs/:id/retry | Authorized retry after safety checks. |
| POST /extract (AI internal) | Extract structured data from a document. |

## 15. Reliability and security requirements

- Use database transactions for approval and job-intent persistence; consider a transactional outbox if enqueue/database consistency becomes a problem.
- Protect uploads: MIME and size checks, random filenames, private storage, and malware scanning when practical.
- Use role-based access control, secure password hashing, least-privilege service credentials and environment secrets.
- Make worker jobs retryable with exponential backoff and a maximum attempt count; preserve failure evidence.
- Add structured logs with correlation IDs, basic health checks, and automated database backups for deployed environments.

## 16. Cost and hosting plan

Target ₹0 development cost: run Docker Compose locally; use open-source PostgreSQL, Redis, Node, Python and a mock Tally server. Gemini free-tier usage is subject to account eligibility and changing quotas; a local model may be used as a fallback but needs adequate hardware. Real TallyPrime may require a legitimate trial or license. Cloud hosting, storage, public IPv4, and domains may incur costs; do not assume AWS services are permanently free. Start local, measure resource usage, then choose deployment.

## 17. Development roadmap and definition of done

| Phase | Deliverables / exit criteria |
| --- | --- |
| 0. Foundation | Monorepo, Docker Compose, DB migrations, lint/typecheck/test CI, README, .env.example. |
| 1. Business skeleton | Login, suppliers, invoice upload/list/detail, basic statuses; tests. |
| 2. AI extraction | FastAPI endpoint, Gemini adapter, Pydantic schema, review UI; evaluation fixtures. |
| 3. Approval | Deterministic totals, duplicate detection, versioned review, approval and audit. |
| 4. Tally mock sync | XML adapter, BullMQ worker, simulator, retry/reconciliation tests and monitor UI. |
| 5. Polish and demo | E2E workflow, error scenarios, docs, screenshots, architecture explanation, demo deployment if affordable. |
| 6. Optional extensions | RAG/MCP/real Tally verification/Kafka only after MVP completion. |

MVP done when a user can upload an invoice, review/correct extracted fields, approve it, simulate a successful and failed sync, retry safely, and inspect a complete audit trail. Automated tests must cover duplicate invoice and duplicate sync cases.

## 18. Proposed repository structure

```text
ledgermind-ai/
  apps/web/                # Next.js
  apps/api/                # Express API
  apps/ai-service/         # FastAPI
  apps/worker/             # BullMQ worker
  packages/database/       # Prisma
  packages/types/          # Shared TS types
  packages/validators/     # Zod
  integrations/tally/      # XML adapter + mock
  infra/docker-compose.yml
  docs/
  .env.example
  README.md
```

## 19. Interview explanation

“I built LedgerMind AI to address a practical workflow around Tally: supplier invoices arrive as documents, require manual entry and verification, and can be difficult to track when synchronization fails. The application uses AI to propose structured invoice data, keeps humans responsible for approval, and uses a background queue with retries, idempotency and audit history to synchronize approved vouchers. I focused on making an AI-assisted financial workflow reliable rather than building a generic chatbot.”

## 20. Decisions confirmed and remaining decisions

Confirmed: independent project; invoice processing rather than full ERP; six main MVP screens; Next.js/Express/PostgreSQL/FastAPI/Gemini; Redis/BullMQ for sync; mock Tally first; local-first free development; human approval before posting; advanced RAG/MCP/Kafka deferred.

Decide during implementation: supported invoice formats and size limits; exact voucher schema and tax rules; supplier matching strategy; single-tenant vs multi-tenant (recommend single-tenant MVP); login provider; hosting choice; whether real TallyPrime access is available for integration tests. Do not block foundation work on these choices.

---

LedgerMind AI  •  Project blueprint  •  v1.0
