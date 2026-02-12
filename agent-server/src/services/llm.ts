import { config } from './config';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LlmResult {
  content: string;
  model: string;
  fallback: boolean;
}

async function callDeepSeek(messages: ChatMessage[]): Promise<LlmResult> {
  const url = `${config.deepseekBaseUrl.replace(/\/$/, '')}/chat/completions`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.deepseekApiKey}`
    },
    body: JSON.stringify({
      model: config.deepseekModel,
      temperature: 0.7,
      messages
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`DeepSeek request failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('Empty DeepSeek response');
  }

  return {
    content,
    model: data.model || config.deepseekModel,
    fallback: false
  };
}

function fallbackReply(userMessage: string, dataContext: string) {
  return [
    'DeepSeek 暂不可用，先给你本地链上结果：',
    dataContext,
    '',
    `你刚才的问题是: ${userMessage}`,
    '如果你要我继续，我可以按你的 NFA 角色风格继续给出下一步动作建议。'
  ].join('\n');
}

export async function generateReply(params: {
  systemPrompt: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  userMessage: string;
  dataContext: string;
}): Promise<LlmResult> {
  if (!config.deepseekApiKey) {
    return {
      content: fallbackReply(params.userMessage, params.dataContext),
      model: 'fallback-local',
      fallback: true
    };
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: params.systemPrompt },
    ...params.history.map((item) => ({ role: item.role, content: item.content })),
    {
      role: 'system',
      content: `链上上下文:\n${params.dataContext}`
    },
    { role: 'user', content: params.userMessage }
  ];

  try {
    return await callDeepSeek(messages);
  } catch {
    return {
      content: fallbackReply(params.userMessage, params.dataContext),
      model: 'fallback-local',
      fallback: true
    };
  }
}
