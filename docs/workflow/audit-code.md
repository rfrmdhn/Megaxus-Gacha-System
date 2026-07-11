# Code Audit Workflow — accounting-api-v2

## Instructions

Perform a code audit focused on **code quality** (not infrastructure or DevOps). Follow the mandatory sequence below — do not skip.

---

## 0) Mandatory Recon (Always First)

### 0.1 Read Project Context

Read in this order before touching code:
1. `docs/architecture.md` — service map and structure
2. `docs/ai-guidelines.md` — rules and applicable constraints
3. `docs/adr.md` — deliberate architectural decisions (do not "fix" without understanding these)
4. `docs/known-issues.md` — known tech debt

### 0.2 Identify Stack

- **Language:** TypeScript (strict mode)
- **Framework:** NestJS (monorepo — `@nestjs/cli`)
- **Data access:** Prisma ORM (shared schema, satu MySQL DB)
- **Linting:** ESLint + Prettier
- **Test:** Jest
- **Queue:** BullMQ + Redis
- **Storage:** MinIO
- **Logging:** Elasticsearch (best-effort)

### 0.3 Architecture Patterns (from Code)

| Layer | Location | Contents |
|---|---|---|
| HTTP binding | `*.controller.ts` | Input validation, route decorators, response mapping |
| Business logic | `*.service.ts` | Orchestration, Prisma queries, domain rules |
| Shared infra | `libs/*` | Prisma client, ES logging, helpers, shared modules |
| DTO validation | `dto/*.dto.ts` | `class-validator` decorators |
| Global filters | `libs/core/src/filters/` | Exception → response envelope mapping |

---

## 1) Audit Scope

### Items Checked

- **Code quality:** readability, maintainability, naming, duplication
- **Business logic correctness:** entity scope enforcement, approval workflow enforcement, journal balance
- **Error handling:** unhandled exceptions, error propagation, missing try/catch
- **Performance:** N+1 queries, over-fetching (missing `select`), synchronous blocking in async context
- **Type safety:** `any` types, missing null checks, unsafe casting
- **Test coverage:** unit test coverage on critical business logic
- **Code smells:** dead code, God class/service, oversized methods

### Items NOT Checked in This Audit

- Infrastructure (Kubernetes, Docker, CI/CD)
- Network security / penetration testing
- Database-level security

---

## 2) Audit Checklist per Service

For each service being audited, check:

### Controller Layer
- [ ] No business logic in controller — only HTTP binding + service call
- [ ] All routes requiring auth already use `JwtAuthGuard`
- [ ] All routes requiring roles already use `RolesGuard` + `@Roles()`
- [ ] DTO validated with `class-validator` (`@IsString`, `@IsNotEmpty`, etc)
- [ ] File upload uses `FileInterceptor` or `FilesInterceptor` with MIME type validation

### Service Layer
- [ ] All entity-scoped queries include `where: { entity_id }` from user context, not from request body
- [ ] No N+1 queries — use Prisma `include`/`select` explicitly
- [ ] Multi-step writes use Prisma transaction (`prisma.$transaction`)
- [ ] No raw SQL unless the reason is documented
- [ ] Approved records cannot be edited/deleted directly (journal approved, COA active)
- [ ] Period closing is verified before creating new journals
- [ ] ES logging wrapped in try/catch

### Shared Libs
- [ ] Logic used in >1 service is already in `libs/` — no duplication
- [ ] `PeriodGateHelper` used for gate submission validation (not custom logic)
- [ ] `SubmissionStatusHelper.buildSummary()` used for status aggregation
- [ ] `calculatePagination()` used for all pagination responses

### Tests
- [ ] Unit tests exist for critical service methods
- [ ] Entity scope is explicitly tested (verify `entity_id` is in Prisma where clause)
- [ ] Approval workflow transitions tested (invalid transition must throw)
- [ ] No real DB/ES/Redis calls in unit tests — all mocked

---

## 3) Patterns to Look For (Common Issues)

### N+1 Query
```typescript
// ❌ N+1
const journals = await prisma.journals.findMany();
for (const j of journals) {
  j.entries = await prisma.journal_entries.findMany({ where: { journal_id: j.id } });
}

// ✅ Use include
const journals = await prisma.journals.findMany({
  include: { journal_entries: true }
});
```

### Missing Entity Scope
```typescript
// ❌ No entity scope
const coas = await prisma.coa.findMany();

// ✅ Must scope
const coas = await prisma.coa.findMany({
  where: { entity_id: user.entity_id }
});
```

### Business Logic in Controller
```typescript
// ❌ Logic in controller
@Post()
async create(@Body() dto, @Request() req) {
  if (dto.debit !== dto.credit) throw new BadRequestException('...');
  return this.prisma.journals.create({ data: dto });
}

// ✅ Controller only forwards to service
@Post()
async create(@Body() dto, @Request() req) {
  return this.journalsService.create(dto, req.user);
}
```

### Unhandled ES Errors
```typescript
// ❌ Can crash service
await this.elasticsearchService.createLog({ ... }); // without try/catch inside

// ✅ createLog already wraps try/catch — safe to use directly
await this.elasticsearchService.createLog({ ... });
```

### Over-fetching from Prisma
```typescript
// ❌ Fetch all fields including unnecessary ones
const user = await prisma.users.findFirst({ where: { id } });

// ✅ Select only what's needed
const user = await prisma.users.findFirst({
  where: { id },
  select: { id: true, name: true, display_name: true }
});
```

---

## 4) Audit Output

The audit report must include:

1. **Recon summary** — services checked, files read
2. **Findings** — per finding:
   - File + line number
   - Category: `entity-scope` | `n+1` | `missing-auth` | `business-logic-in-controller` | `error-handling` | `type-safety` | `duplication` | `test-gap`
   - Severity: `critical` | `high` | `medium` | `low`
   - Problem description
   - Fix example (minimal diff)
3. **Improvement plan** — fix priorities
4. **Score per aspect** (see rubric below)

---

## 5) Scoring Rubric

| Aspect | Score (1–10) |
|---|---|
| Recon completeness | |
| Entity scope enforcement | |
| Business logic placement (service vs controller) | |
| Error handling completeness | |
| N+1 / query efficiency | |
| Type safety | |
| Test coverage on critical logic | |
| Duplication / shared lib usage | |
| Naming & readability | |
| Approval workflow enforcement | |

**Final Rating = average. Output: Rating: X/10**
