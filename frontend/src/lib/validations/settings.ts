import { z } from "zod";

export const llmConfigSchema = z.object({
  baseUrl: z
    .string()
    .min(1, "Base URL 不能为空")
    .url("请输入有效的 URL 格式"),
  apiKey: z
    .string()
    .min(1, "API Key 不能为空")
    .regex(/^sk-/, "API Key 应以 sk- 开头"),
  model: z.string().min(1, "Model 不能为空"),
});

export type LLMConfigFormValues = z.infer<typeof llmConfigSchema>;
