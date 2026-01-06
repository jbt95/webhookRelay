# AGENTS

**Scope**: Applies to all files in this repository unless a nested `AGENTS.md` overrides it.

## Architecture & Design

- Favor Domain-Driven Design: clear bounded contexts, ubiquitous language, and domain services over anemic models.
- Slice work vertically end-to-end; keep changes small and incremental to reduce risk.
- Apply SOLID with emphasis on Dependency Inversion; depend on abstractions and domain contracts.
- Prefer tell-don't-ask and functional-style composition; avoid shared mutable state and side effects when possible.
- Keep code clean: small functions/modules, clear naming, no dead code, and minimal feature flags.

## Type Safety

- No `any`. Use precise domain types, discriminated unions, and shared schemas for contracts.
- Enforce strict null/undefined handling; validate external inputs at boundaries.
- Prefer total functions and exhaustive checks (e.g., `switch` with `never` guards).

## Testing

- Maintain a balanced suite: unit, integration, and end-to-end tests for critical flows.
- Avoid mocking; use real collaborators, in-memory adapters, or test fixtures to exercise contracts.
- Test vertical slices through real boundaries (HTTP, DB adapters, queues) where feasible.

## Functional Programming

- Prefer declarative over imperative; express intent with clear data flows.
- Use composition over inheritance; build behavior by combining small functions.
- Embrace monads and algebraic data types for predictable effects and error handling.
- Keep functions pure and total; isolate side effects at the boundaries.

## Workflow & Tooling

- Always run type checks and linting before committing; do not skip pre-commit hooks.
- Keep commits and PRs focused and incremental; avoid large, cross-cutting changes without justification.
- Prefer automated formatting and static analysis; fix issues at the source, not downstream.
