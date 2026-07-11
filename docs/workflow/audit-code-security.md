# Security Audit Workflow — accounting-api-v2

## Instructions

Perform a security audit focused on **code-level risks** — not pentesting or infrastructure. Follow the mandatory sequence below.

---

## 0) Mandatory Recon (Always First)

Read before touching code:
1. `docs/auth.md` — JWT payload, role system, route auth matrix
2. `docs/architecture.md` — service boundaries, trust model
3. `docs/adr.md` — deliberate security decisions (ADR-002, ADR-003, ADR-005)

### Trust Boundary Map

```
Internet → API Gateway (JWT validation, CORS, throttle)
         → Downstream services (trusted internal — does not re-validate JWT)
         → MySQL (Prisma — parameterized queries)
         → Redis (job queue)
         → MinIO (file storage)
         → Elasticsearch (logging)
```

- **Public routes:** `/auth/login`, `/portal/login`, `/portal/login/auth-test`, `/swagger/*`
- **Protected routes:** all others — JWT required
- **Internal only (not exposed):** direct downstream ports (31011, 31013, 31014, 31015, 31016)

---

## 1) Risk Areas Checked

### Authentication & Authorization
- [ ] All protected routes in gateway use `JwtAuthGuard`
- [ ] `JWT_SECRET` is not hardcoded — only from `process.env.JWT_SECRET`
- [ ] `JWT_EXPIRES_IN` is configured with a reasonable value
- [ ] `administrator` bypass in `RolesGuard` is explicit and intentional (ADR-005)
- [ ] Portal JWT cannot access accounting/finance/consolidation routes
- [ ] Tokens are not logged (bearer token, API key, password)

### Entity Scope / Data Isolation
- [ ] All entity-scoped queries include `where: { entity_id }` from JWT context
- [ ] `entity_id` is not taken from request body for ownership checks
- [ ] User cannot access other entity's data without cross-entity role

### Input Validation
- [ ] All request bodies use DTO with `class-validator` decorators
- [ ] `ValidationPipe` is active globally (`whitelist: true`, `forbidNonWhitelisted: true`)
- [ ] File upload MIME type is validated before processing
- [ ] Query params used in Prisma queries are sanitized (not directly injected into `where`)

### Injection Risks
- [ ] No raw SQL string concatenation — all through Prisma parameterized queries
- [ ] No `eval()`, `Function()`, or dynamic code execution
- [ ] File paths are not constructed from user input without sanitization

### Sensitive Data
- [ ] Passwords are hashed with bcrypt (not MD5/SHA1)
- [ ] JWT secret is not committed in codebase
- [ ] Credentials (API key, DB password) only from environment variables
- [ ] Response does not leak sensitive fields (password hash, unnecessary internal IDs)
- [ ] ES logs do not include bearer tokens or passwords

### CORS & Headers
- [ ] CORS only allows `FRONTEND_ORIGIN` and `FRONTEND_PORTAL_ORIGIN`
- [ ] Helmet is active (security headers: X-Content-Type-Options, X-Frame-Options, etc)
- [ ] Rate limiting is active via ThrottlerGuard

### File Upload
- [ ] File size validation (max size limit)
- [ ] MIME type validation — only allow expected formats (xlsx, pdf, etc)
- [ ] Uploaded files are not directly executed
- [ ] User-provided file names are sanitized before storing

---

## 2) Dangerous Patterns to Look For

### Missing Auth Guard
```typescript
// ❌ Route protected without guard
@Get('journals')
getJournals() { ... }

// ✅ Must have guard
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('journal_maker', 'journal_checker')
@Get('journals')
getJournals() { ... }
```

### Entity Scope Leak
```typescript
// ❌ No entity filter — all users can see all data
const journals = await prisma.journals.findMany();

// ✅ Must filter entity from JWT
const journals = await prisma.journals.findMany({
  where: { entity_id: req.user.entity_id }
});
```

### Trust Body for entity_id
```typescript
// ❌ Trust entity_id from request body
const journal = await prisma.journals.create({
  data: { ...dto, entity_id: dto.entity_id } // BERBAHAYA
});

// ✅ Take entity_id from JWT/user context
const journal = await prisma.journals.create({
  data: { ...dto, entity_id: req.user.entity_id }
});
```

### Logging Credential
```typescript
// ❌ Log credential
this.logger.log(`Login attempt: ${dto.username} / ${dto.password}`);

// ✅ Only log username
this.logger.log(`Login attempt for user: ${dto.username}`);
```

### Hardcoded Secret
```typescript
// ❌ Hardcoded
const secret = 'my-jwt-secret-123';

// ✅ From environment
const secret = process.env.JWT_SECRET;
```

---

## 3) Security Audit Output

The report must include:

1. **Recon summary** — services checked, trust boundaries mapped
2. **Findings** — per finding:
   - File + line number
   - Category: `auth-bypass` | `entity-scope-leak` | `injection` | `sensitive-data-exposure` | `missing-validation` | `cors` | `file-upload`
   - Severity: `critical` | `high` | `medium` | `low` | `informational`
   - Evidence (code snippet)
   - Impact (what an attacker could do)
   - Fix (minimal diff)
3. **Risk summary** — number of findings per severity
4. **Score per aspect** (see rubric below)

---

## 4) Scoring Rubric

| Aspect | Score (1–10) |
|---|---|
| Authentication completeness | |
| Authorization (role + entity scope) | |
| Input validation | |
| Injection prevention | |
| Sensitive data handling | |
| CORS & security headers | |
| File upload security | |
| Error message safety (no stack leak) | |
| Credential management | |
| Logging safety | |

**Final Rating = average. Output: Rating: X/10**
