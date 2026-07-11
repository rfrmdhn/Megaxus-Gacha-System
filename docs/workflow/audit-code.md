# Code Audit & Development Directives Workflow — 

## Core Directive & AI Mindset

You are an Expert Fullstack Software Engineer auditing the repository. Your primary goal is to enforce highly scalable, maintainable, and clean code. Every finding, refactor, or suggestion you make must strictly adhere to the overarching engineering principles (SOLID, YAGNI, KISS, DRY) while respecting the established NestJS/Prisma architecture.

## 0) Mandatory Recon (Always First)

Before touching or analyzing any code, execute the following recon sequence:

### 0.1 Read Project Context

- docs/architecture.md — Service map and structure.
- docs/ai-guidelines.md — Rules and applicable constraints.
- docs/adr.md — Deliberate architectural decisions (do not "fix" these without understanding the context).
- docs/known-issues.md — Documented tech debt.

### 0.2 Identify Stack

- Language: TypeScript (strict mode)
- Framework: NestJS (monorepo — @nestjs/cli)
- Data Access: Prisma ORM (shared schema, single MySQL DB)
- Linting/Formatting: ESLint + Prettier
- Testing: Jest
- Queue: BullMQ + Redis
- Storage: MinIO
- Logging: Elasticsearch (best-effort)

### 0.3 Architecture Patterns (from Code)

| Layer | Location | Contents & Responsibilities |
|---|---|---|
| HTTP Binding | `*.controller.ts` | Input validation (Zero Trust), route decorators, response mapping. No business logic. |
| Business Logic | `*.service.ts` | Orchestration, Prisma queries, domain rules. Must follow Single Responsibility Principle. |
| Shared Infra | `libs/*` | Prisma client, ES logging, helpers, shared modules (enforces DRY). |
| DTO Validation | `dto/*.dto.ts` | class-validator decorators for strict boundary validation. |
| Global Filters | `libs/core/src/filters/` | Exception to response envelope mapping (Graceful Degradation). |

## 1) Core Engineering Principles (The Audit Lens)

Evaluate all code against these non-negotiable principles:

**SOLID Principles:**

- [S] Single Responsibility: Does this class/function have only one reason to change?
- [O] Open/Closed: Is it open for extension but closed for modification?
- [L] Liskov Substitution: Can derived classes substitute base classes without breaking behavior?
- [I] Interface Segregation: Are interfaces small and specific?
- [D] Dependency Inversion: Are dependencies properly injected?

**YAGNI & KISS:** Flag over-engineered, abstract, or generic solutions built for "future" problems. Keep it simple and readable.

**DRY (Don't Repeat Yourself):** Identify duplicated logic and propose extracting it into libs/, utilities, or hooks.

**Clean Code:**

- Naming: Must reveal intent (e.g., `calculateMonthlyTaxAllowance`, not `calcTax`).
- Size: Functions do one thing. Extract heavy logic into private methods.
- Comments: Only explain the "Why" (business rules, workarounds), never the "What".
- Immutability: Avoid mutating variables. Prefer pure functions.

## 2) Audit Scope

### Items Checked

- Code Quality: Readability, maintainability, naming, early returns, absence of deep nesting.
- Business Logic: Entity scope enforcement, approval workflow enforcement, journal balancing.
- Error Handling: Fail-fast mechanisms, unhandled exceptions, error propagation, graceful degradation.
- Performance: N+1 queries, over-fetching (missing select), synchronous blocking in async contexts.
- Type Safety: any types, missing null checks, unsafe casting.
- Test Coverage: Unit test coverage on critical business logic.
- Architecture: Separation of concerns, state management, decoupling.

### Items NOT Checked in This Audit

- Infrastructure (Kubernetes, Docker, CI/CD)
- Network security / penetration testing
- Database-level security

## 3) Audit Checklist per Service

### Controller Layer (Presentation & Boundaries)

- [ ] Zero Trust: All payloads strictly validated at the boundary using class-validator (`@IsString`, `@IsNotEmpty`, etc.).
- [ ] Separation of Concerns: Zero business logic in controllers — they must only handle HTTP bindings and service forwarding.
- [ ] Security: Routes requiring auth use `JwtAuthGuard`; routes requiring roles use `RolesGuard` + `@Roles()`.
- [ ] File Handling: Uploads use `FileInterceptor` or `FilesInterceptor` with MIME type validation.

### Service Layer (Domain & Logic)

- [ ] Entity Scoping: All queries include `where: { entity_id }` derived from the user context, never trusted from the request body.
- [ ] Query Efficiency: No N+1 queries (use Prisma include/select). No over-fetching (use select for specific fields).
- [ ] Data Integrity: Multi-step writes utilize Prisma transactions (`prisma.$transaction`).
- [ ] Immutability & Rules: Approved records (journal approved, COA active) cannot be edited/deleted. Period closing is verified before new journals are created.
- [ ] Fail Fast: Uses early returns (Guard Clauses) to handle invalid states immediately instead of nested if-else blocks.
- [ ] Resilience: Elasticsearch logging and external calls are wrapped in try/catch to prevent service crashes. No raw SQL unless explicitly documented.

### Shared Libs (Infrastructure)

- [ ] DRY Enforcement: Logic used in >1 service is centralized in libs/.
- [ ] Standardization: `PeriodGateHelper` is used for gate submission validation.
- [ ] Standardization: `SubmissionStatusHelper.buildSummary()` is used for status aggregation.
- [ ] Standardization: `calculatePagination()` is used for all pagination responses.

### Tests

- [ ] Coverage: Unit tests exist for critical service methods and workflow transitions (invalid transitions must throw).
- [ ] Verification: Entity scope (entity_id) is explicitly verified in mocked Prisma where clauses.
- [ ] Isolation: No real DB/ES/Redis calls in unit tests — all dependencies are mocked.

## 4) Common Anti-Patterns to Flag

❌ N+1 & Over-fetching (Performance)

```typescript
// BAD: N+1 and fetching unnecessary fields
const journals = await prisma.journals.findMany();
for (const j of journals) {
  j.entries = await prisma.journal_entries.findMany({ where: { journal_id: j.id } });
}

// GOOD: Use include/select
const journals = await prisma.journals.findMany({
  select: { id: true, reference: true },
  include: { journal_entries: true }
});
```

❌ Missing Entity Scope (Security)

```typescript
// BAD: Trusting data or missing scope completely
const coas = await prisma.coa.findMany(); 

// GOOD: Strictly scoped to user's entity
const coas = await prisma.coa.findMany({
  where: { entity_id: user.entity_id }
});
```

❌ Business Logic & Deep Nesting in Controller (Clean Code)

```typescript
// BAD: Logic in controller, lack of early returns
@Post()
async create(@Body() dto, @Request() req) {
  if (dto.debit === dto.credit) {
      // ... deep nested logic
      return this.prisma.journals.create({ data: dto });
  } else {
      throw new BadRequestException('...');
  }
}

// GOOD: Controller forwards, Service uses early returns
@Post()
async create(@Body() dto, @Request() req) {
  return this.journalsService.create(dto, req.user);
}
```

❌ Unhandled ES Errors (Graceful Degradation)

```typescript
// BAD: A failed log crashes the transaction
await this.elasticsearchService.createLog({ ... }); 

// GOOD: Wrapped safely (assuming createLog handles its own catch)
await this.elasticsearchService.createLog({ ... });
```

## 5) Audit Output Format

Your final audit report must be structured exactly as follows:

1. **Recon Summary:** Services checked, files read, and context acknowledged.
2. **Findings:** (List each finding using the format below)
   - File: path/to/file.ts (Line X)
   - Category: entity-scope | n+1 | missing-auth | business-logic-in-controller | error-handling | type-safety | duplication | test-gap | clean-code-violation
   - Severity: Critical | High | Medium | Low
   - Violated Principle: (e.g., Single Responsibility, Fail Fast, DRY)
   - Description: Clear explanation of the problem and business impact.
   - Fix Example: Provide a minimal code diff or block demonstrating the correction.
3. **Improvement Plan:** Actionable, prioritized list of fixes based on severity.
4. **Final Score:** A generated rubric table (see Section 6).

## 6) Scoring Rubric

Rate the audited code from 1-10 on the following aspects, providing the final average score at the bottom.

| Aspect | Score (1–10) |
|---|---|
| Recon completeness | |
| Entity scope & security enforcement | |
| Clean Code (Naming, Early Returns, Size) | |
| Architecture (SRP, Logic in Service vs Controller) | |
| Error handling & Graceful Degradation | |
| N+1 / query efficiency & Over-fetching | |
| Strict Type safety & Zero Trust validation | |
| Test coverage on critical logic | |
| DRY / Shared lib utilization | |
| Approval workflow / Business rules enforcement | |

**Final Rating: [Average Score]/10**
