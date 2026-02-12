# Contributing

Thanks for contributing.

## Scope
We welcome contributions in:
- Smart contract safety and test coverage
- Frontend + API reliability
- Agent tooling and provider abstraction
- BAP-578 compatibility and interoperability
- Documentation and developer experience

## Development Setup
```bash
npm install
cp .env.example .env
npm run compile
npm test

cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## Pull Request Rules
1. Keep PRs focused (single concern preferred).
2. Include tests for behavior changes.
3. Explain trade-offs for security/auth/contract math changes.
4. Do not commit any secret or production credential.

## Commit / PR Checklist
- [ ] No `.env` or secret files
- [ ] Tests pass for changed modules
- [ ] Docs updated when behavior changes
- [ ] Breaking changes are explicitly marked

## Issue Labels (Recommended)
- `bap578`
- `security`
- `contracts`
- `frontend`
- `agent`
- `docs`
