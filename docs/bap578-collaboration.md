# BAP-578 Collaboration Guide

This document describes where BAP-578 oriented contributors can help in this repository.

## Why This Exists
The project aims to be an auditable and extensible open implementation of an NFA mint + agent stack.

Before proposing changes, please review:
- `docs/bap578-status.md`
- `docs/bap578-compatibility-matrix.md`

## Current Mapping in This Repo
- On-chain identity fields: `roleId`, `traitSeed`, `mintedAt` in `FlapNFAMiner`
- Ownership-gated agent access in API layer
- Holder-right transfer sync in `NFADividend.onNFATransfer`
- Tool-driven agent responses (balance/dividend/claim preparation)

## High-Value Contribution Tracks

### Track A: Standard Compatibility Review
- Validate contract/API assumptions against current BAP-578 expectations
- Propose naming/interface adjustments for interoperability
- Suggest event schema improvements for indexers and analytics

### Track B: Security and Correctness
- Add edge-case tests for mining, cooldown, and transfer correction logic
- Propose fuzz/property tests for dividend accounting invariants
- Review authorization and replay-resistance paths in `/api/chat`

### Track C: Agent Protocol and Extensibility
- Design a provider-agnostic LLM adapter interface
- Improve prompt/versioning strategy for persona determinism
- Extend chain tools with explicit safety and simulation modes

### Track D: Interoperability PoCs
- Cross-chain identity mirror strategy
- Standardized metadata/traits export format
- Composable agent-to-agent message schema

## Suggested First Issues
1. Add invariant tests for `magnifiedDividendPerShare` corrections.
2. Add a provider interface that supports at least two LLM backends.
3. Add explicit event docs for identity lifecycle and dividend state changes.
4. Draft a compatibility matrix document for BAP-578 related expectations.

## How To Contribute
1. Open an issue with one of these prefixes: `bap578:`, `security:`, `interop:`, `agent:`.
2. Describe expected behavior, not only code changes.
3. Include tests or a rationale if tests are not feasible.
4. Link related contract/API paths directly.

## Review Expectations
- Security-sensitive changes require at least one additional reviewer.
- PRs touching contract math or auth logic should include test evidence.
- Backward-incompatible changes should include a migration note.
