"use client";

import { useCallback, useEffect, useState } from "react";
import type { LLMConfig } from "@/types";
import { getLLMConfig, isLLMConfigured, saveLLMConfig } from "@/lib/llm-config";

export function useLLMConfig() {
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    setConfig(getLLMConfig());
    setConfigured(isLLMConfigured());
  }, []);

  const save = useCallback((newConfig: LLMConfig) => {
    saveLLMConfig(newConfig);
    setConfig(newConfig);
    setConfigured(!!(newConfig.baseUrl && newConfig.apiKey && newConfig.model));
  }, []);

  return { config, configured, save };
}
