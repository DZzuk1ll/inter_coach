import type { ApiResponse } from "@/types";
import { getAnonymousId } from "./auth";
import { getLLMConfig } from "./llm-config";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  const anonymousId = getAnonymousId();
  if (anonymousId) {
    headers["X-Anonymous-Id"] = anonymousId;
  }

  const llmConfig = getLLMConfig();
  if (llmConfig) {
    if (llmConfig.baseUrl) headers["X-LLM-Base-URL"] = llmConfig.baseUrl;
    if (llmConfig.apiKey) headers["X-LLM-API-Key"] = llmConfig.apiKey;
    if (llmConfig.model) headers["X-LLM-Model"] = llmConfig.model;
  }

  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data: ApiResponse<T> = await response.json();

  if (!response.ok || !data.success) {
    throw new ApiError(
      data.error || `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return data.data as T;
}

export const api = {
  async get<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: { ...getHeaders() },
    });
    return handleResponse<T>(response);
  },

  async post<T>(url: string, body?: unknown): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getHeaders(),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async upload<T>(url: string, formData: FormData): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: { ...getHeaders() },
      body: formData,
    });
    return handleResponse<T>(response);
  },

  async delete<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      method: "DELETE",
      headers: { ...getHeaders() },
    });
    return handleResponse<T>(response);
  },

  async stream(
    url: string,
    body: unknown,
    onChunk: (content: string) => void,
    onEvent?: (event: string, data: unknown) => void,
  ): Promise<void> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getHeaders(),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      let message = `Request failed with status ${response.status}`;
      try {
        const parsed = JSON.parse(text);
        message = parsed.error || parsed.detail || message;
      } catch {
        // use default message
      }
      throw new ApiError(message, response.status);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new ApiError("No response body", 500);

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let currentEvent = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7);
        } else if (line.startsWith("data: ")) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            if (currentEvent && onEvent) {
              onEvent(currentEvent, parsed);
              currentEvent = "";
            } else if (parsed.content !== undefined) {
              onChunk(parsed.content);
            }
          } catch {
            // skip unparseable lines
          }
        }
      }
    }
  },
};
