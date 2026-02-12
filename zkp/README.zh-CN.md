# ZK 可验证 AI 内容（PoC）

目标：让 **Agent/NFA 的“对话/训练语料/行为日志”** 在不直接公开全部内容的前提下做到 **可验证**。

这份 PoC 做的是一个最小闭环：
- 把 transcript 切成若干条记录（message/chunk）
- 对每条记录做哈希（例如 `keccak256(message)`），再做 SNARK 友好哈希（例如 Poseidon）组成叶子
- 把所有叶子组成 Merkle Tree，得到 `root`
- 把 `root` 上链（按 `tokenId`/agent 维度存）
- 生成零知识证明：**证明某条 message 的 hash 确实包含在该 root 对应的集合里**

重要边界（需要诚实对外表达）：
- 这只能证明“某条内容属于一个被承诺的集合”，不能单独证明“训练过程真实发生”或“模型确实由该语料训练得出”。
- 想进一步证明“模型输出是由某个确定版本模型产生”，需要把 **模型版本/推理参数/输入输出** 也纳入承诺与证明设计，复杂度会高很多。

## 目录

- 电路草图：`zkp/circuits/transcript_inclusion.circom`
- 合约 PoC：`contracts/ZKTranscriptRegistry.sol`
- verifier 接口：`contracts/interfaces/IGroth16Verifier.sol`
- 测试 stub（用 mock verifier）：`test/ZKTranscriptRegistry.test.js`

## 如何接入到 BSC / BAP-578 方向（建议）

- 把 `merkleRoot` 当作“Agent 的可验证历史锚点”：
  - 可以直接放在一个独立 Registry（像本 PoC）
  - 或者作为 `BAP578Adapter` 的扩展字段/事件（更贴合协议语义）
- 生产环境里 verifier 应替换为由 `snarkjs` 生成的 Groth16 Verifier 合约（BSC/EVM 友好）

### 这份仓库 PoC 的接入点（已实现）

- `ZKTranscriptRegistry` 的提交权限是 **按 NFA tokenId 的 owner/approved** 来判定（并支持 EIP-712 签名代提交）：
  - `commitTranscript(tokenId, root)`：owner 或 operator 直接提交
  - `commitTranscriptBySig(tokenId, root, deadline, sig)`：owner 线下签名，agent-server/relayer 代提交
- `BAP578Adapter` 提供了一个非破坏式扩展接口 `IBAP578VerifiableHistory`：
  - `transcriptRegistry()`：返回 registry 地址
  - `getTranscriptCommitment(tokenId)`：返回 `(root, committedAt)`
