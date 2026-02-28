import { getServerConfig } from './config';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LlmResult {
  content: string;
  model: string;
  fallback: boolean;
}

async function callOpenRouter(messages: ChatMessage[]): Promise<LlmResult> {
  const config = getServerConfig();
  const url = `${config.openRouterBaseUrl.replace(/\/$/, '')}/chat/completions`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.openRouterApiKey}`
  };
  if (config.openRouterSiteUrl) {
    headers['HTTP-Referer'] = config.openRouterSiteUrl;
  }
  if (config.openRouterAppName) {
    headers['X-Title'] = config.openRouterAppName;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.openRouterModel,
      temperature: 0.7,
      messages
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter request failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('Empty OpenRouter response');
  }

  return {
    content,
    model: data.model || config.openRouterModel,
    fallback: false
  };
}

function fallbackReply(userMessage: string, dataContext: string) {
  return [
    'OpenRouter 暂不可用，先给你本地链上结果：',
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
  const config = getServerConfig();
  if (!config.openRouterApiKey) {
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
    return await callOpenRouter(messages);
  } catch {
    return {
      content: fallbackReply(params.userMessage, params.dataContext),
      model: 'fallback-local',
      fallback: true
    };
  }
}
