<p align="center">
  <img src="frontend/public/images/logo.png" alt="Flap NFA Logo" width="320" />
</p>

# Flap NFA Mint (Open Source)

**Language / 语言**: `English` | [简体中文](README.zh-CN.md)

Open-source reference implementation for an NFA minting dApp on BNB Chain style networks.
This repository contains only public, production-safe engineering materials.

## What This Repo Includes
- Smart contracts: mining + NFA mint + dividend accounting
- Hardhat tests and deployment scripts
- Next.js frontend (`/`, `/my-nfa`, `/chat`)
- Next.js API routes for agent chat and chain tools
- Optional legacy Express agent server (`agent-server/`)

## What This Repo Does NOT Include
- Production secrets (private keys, API keys, JWTs)
- Private team chats or business strategy logs
- Internal-only ops/progress/reference folders

## Architecture
- `contracts/FlapNFAMiner.sol`: mine, mint, role/trait identity
- `contracts/NFADividend.sol`: per-holder dividend bookkeeping and claim
- `scripts/`: deploy/setup/metadata/token-launch helper scripts
- `scripts/deploy-adapter.js`: deploy BAP-578 adapter skeleton (non-breaking)
- `frontend/`: dApp UI + API routes
- `agent-server/`: optional standalone server implementation

## Documentation Map
- Project docs index: `docs/README.md`
- BAP-578 status summary: `docs/bap578-status.md`
- BAP-578 compatibility matrix: `docs/bap578-compatibility-matrix.md`

## Quick Start

### 1) Contracts and tests
```bash
npm install
cp .env.example .env
npm run compile
npm test
```

### 2) Frontend app
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open:
- `http://localhost:3000/`
- `http://localhost:3000/my-nfa`
- `http://localhost:3000/chat`

### 3) Optional legacy server
```bash
cd agent-server
npm install
cp .env.example .env
npm run dev
```

## Environment and Security Rules
- `.env.example` files are templates only.
- Do not commit `.env`, `.env.local`, `private_key`, `dev_private_key`, or any real credentials.
- Before pushing, run a local sensitive scan:
```bash
rg -n 'PRIVATE_KEY|API_KEY|JWT|SECRET|sk-' .
```

## Root Scripts
```bash
npm run compile
npm run test
npm run clean
npm run deploy:contracts
npm run deploy:adapter
npm run launch:token
npm run setup:post-launch
npm run find:salt
npm run upload:meta
npm run ipfs:hashlips
```

## BAP-578 Status
This repository currently provides a BAP-578-aligned engineering implementation, not a formal full-interface protocol certification.

Flap ecosystem positioning:
- nfaclaw can be presented as the first BAP-578-aligned NFA landing implementation on the Flap platform.
- Keep wording at "aligned landing implementation" until full interface conformance is complete.

Current status:
- Implemented: NFA identity-like on-chain fields (`roleId`, `traitSeed`, `mintedAt`), ownership-gated agent access, transfer-synced holder rights.
- Not yet formalized: explicit official BAP-578 interface contracts, conformance test suite, and protocol-level certification artifacts.

Professional references:
- `docs/bap578-status.md`
- `docs/bap578-compatibility-matrix.md`

Recommended external wording:
> nfaclaw is a BAP-578-aligned NFA implementation in production practice, with additional creative mechanics (PoW minting, dividend flywheel, and agent chat). We are incrementally aligning to a fuller protocol surface.

## Open Collaboration (BAP-578)
We want this repo to be easy for standard contributors and protocol experts to review.

Start here:
- `docs/bap578-collaboration.md`
- `CONTRIBUTING.md`
- `SECURITY.md`

Key contribution areas:
- Standard compatibility and interface review
- Contract security edge cases and fuzz tests
- Agent message/tool protocol improvements
- LLM provider abstraction (beyond OpenRouter)
- Cross-chain or interoperability PoCs

## Governance and Community Docs
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- `LICENSE`

## License
MIT. See `LICENSE`.
