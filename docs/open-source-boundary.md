# Open Source Boundary

This repository is a public engineering artifact. It is not an operations vault.

## Public by Default
- Source code
- Test code
- Deployment scripts (without real keys)
- Documentation and architecture notes

## Never Public
- Real private keys
- API credentials, JWT secrets
- Private chat logs / personal identifiers
- Internal partner-only materials

## Mandatory Pre-PR Checklist
1. `git diff` has no real credentials.
2. `.env` / `.env.local` files are not staged.
3. No private identity or chat history is present in docs.
4. Tests still pass for touched logic.

## Sensitive Scan Command
```bash
rg -n 'PRIVATE_KEY|API_KEY|JWT|SECRET|sk-' .
```
