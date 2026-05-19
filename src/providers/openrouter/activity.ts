import { env } from '../../config/index.js';

const BASE_URL = 'https://openrouter.ai/api/v1';

interface CreditsResponse {
  data: {
    total_credits: number;
    total_usage: number;
  };
}

interface ActivityItem {
  date: string;
  model: string;
  usage: number;
  requests: number;
  prompt_tokens: number;
  completion_tokens: number;
}

interface ActivityResponse {
  data: ActivityItem[];
}

export async function getAccountCredits(): Promise<{ totalCredits: number; totalUsage: number; remaining: number }> {
  const response = await fetch(`${BASE_URL}/credits`, {
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`OpenRouter credits API error ${response.status}`);
  }

  const data = (await response.json()) as CreditsResponse;
  return {
    totalCredits: data.data.total_credits,
    totalUsage: data.data.total_usage,
    remaining: data.data.total_credits - data.data.total_usage,
  };
}

export async function getActivity(days: number = 7): Promise<ActivityItem[]> {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

  const url = new URL(`${BASE_URL}/activity`);
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
    },
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as ActivityResponse;
  return data.data ?? [];
}

export async function getSpendingSummary(days: number = 30): Promise<{
  totalUsd: number;
  totalRequests: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  byModel: Array<{ model: string; usd: number; requests: number }>;
}> {
  const activity = await getActivity(days);

  const byModel: Record<string, { usd: number; requests: number }> = {};
  let totalUsd = 0;
  let totalRequests = 0;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  for (const item of activity) {
    totalUsd += item.usage;
    totalRequests += item.requests;
    totalPromptTokens += item.prompt_tokens;
    totalCompletionTokens += item.completion_tokens;

    const key = item.model;
    if (!byModel[key]) byModel[key] = { usd: 0, requests: 0 };
    byModel[key].usd += item.usage;
    byModel[key].requests += item.requests;
  }

  return {
    totalUsd,
    totalRequests,
    totalPromptTokens,
    totalCompletionTokens,
    byModel: Object.entries(byModel)
      .map(([model, stats]) => ({ model, ...stats }))
      .sort((a, b) => b.usd - a.usd),
  };
}
