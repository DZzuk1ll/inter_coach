import type { LLMConfig } from "@/types";

const STORAGE_KEY = "llm_config";

export function getLLMConfig(): LLMConfig | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LLMConfig;
  } catch {
    return null;
  }
}

export function saveLLMConfig(config: LLMConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearLLMConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isLLMConfigured(): boolean {
  const config = getLLMConfig();
  return !!(config?.baseUrl && config?.apiKey && config?.model);
}

export const LLM_PRESETS: Record<string, Partial<LLMConfig>> = {
  OpenAI: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o" },
  DeepSeek: { baseUrl: "https://api.deepseek.com", model: "deepseek-chat" },
  SiliconFlow: { baseUrl: "https://api.siliconflow.cn/v1", model: "Qwen/Qwen3-8B" },
};
