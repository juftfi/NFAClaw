<p align="center">
  <img src="frontend/public/images/logo.png" alt="Flap NFA Logo" width="320" />
</p>

# Flap NFA Mint（开源版）

**Language / 语言**: [English](README.md) | `简体中文`

这是一个面向 BNB Chain 生态的 NFA（Non-Fungible Agent）开源实现，重点是可运行、可审计、可扩展。

## 仓库包含内容

- 合约：挖矿 + NFA 铸造 + 分红记账
- 兼容层：`BAP578Adapter` 骨架（非破坏式接入）
- Hardhat 测试与部署脚本
- Next.js 前端（`/`、`/my-nfa`、`/chat`）
- Next.js API（Agent 聊天与链上工具）
- 可选独立服务（`agent-server/`）

## 仓库不包含内容

- 任何生产密钥（私钥/API Key/JWT）
- 私聊记录、内部经营策略
- 内部 `ops/progress/reference` 材料

## 文档导航

- 项目文档索引：`docs/README.md`
- BAP-578 状态说明：`docs/bap578-status.md`
- BAP-578 兼容矩阵：`docs/bap578-compatibility-matrix.md`

## 快速开始

### 1) 合约与测试

```bash
npm install
cp .env.example .env
npm run compile
npm test
```

### 2) 前端

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### 3) Adapter 骨架部署（可选）

```bash
# 优先使用 ADAPTER_NFA_ADDRESS；为空时回退到 MINER_ADDRESS
npm run deploy:adapter
```

## BAP-578 状态（重要）

当前仓库是 **BAP-578 对齐的工程实践**。

Flap 平台定位建议：

- nfaclaw 可定位为 Flap 平台首个 BAP-578 对齐 NFA 落地实现。
- 已有：NFA 身份字段、持有者门控、转移后权益同步
- 未完全对齐：官方接口面、一致性测试套件、协议级完整声明

详细见：

- `docs/bap578-status.md`
- `docs/bap578-compatibility-matrix.md`

> nfaclaw 正在进行 BAP-578 的实践落地，并在此基础上加入 PoW Mint、分红飞轮与 Agent Chat 的创意机制；协议兼容性正在持续增强。

## 开放协作

- 协作入口：`docs/bap578-collaboration.md`
- 贡献指南：`CONTRIBUTING.md`
- 安全策略：`SECURITY.md`

## 许可证

MIT，见 `LICENSE`。
