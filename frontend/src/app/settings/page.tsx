"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLLMConfig } from "@/hooks/use-llm-config";
import { useDeleteUser } from "@/hooks/use-user";
import { clearAnonymousId, regenerateAnonymousId } from "@/lib/auth";
import { clearLLMConfig, LLM_PRESETS } from "@/lib/llm-config";
import { llmConfigSchema, type LLMConfigFormValues } from "@/lib/validations/settings";

export default function SettingsPage() {
  const { config, save } = useLLMConfig();
  const deleteUser = useDeleteUser();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LLMConfigFormValues>({
    resolver: zodResolver(llmConfigSchema),
  });

  useEffect(() => {
    if (config) {
      setValue("baseUrl", config.baseUrl);
      setValue("apiKey", config.apiKey);
      setValue("model", config.model);
    }
  }, [config, setValue]);

  const onSubmit = (data: LLMConfigFormValues) => {
    save(data);
    toast.success("LLM 配置已保存");
  };

  const applyPreset = (name: string) => {
    const preset = LLM_PRESETS[name];
    if (preset.baseUrl) setValue("baseUrl", preset.baseUrl);
    if (preset.model) setValue("model", preset.model);
  };

  return (
    <div className="space-y-6">
      <h1
        className="text-lg font-semibold tracking-tight"
        style={{ color: "var(--foreground)" }}
      >
        设置
      </h1>

      {/* LLM Config Section */}
      <section
        className="rounded-lg p-5"
        style={{
          background: "var(--surface-primary)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <h2
          className="text-[13px] font-semibold mb-4"
          style={{ color: "var(--foreground)" }}
        >
          LLM 配置
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex gap-1.5 flex-wrap">
            {Object.keys(LLM_PRESETS).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => applyPreset(name)}
                className="px-2 py-0.5 text-[12px] font-medium rounded transition-colors cursor-pointer"
                style={{
                  color: "var(--foreground-muted)",
                  background: "var(--surface-secondary)",
                  border: "1px solid var(--border-default)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--surface-tertiary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--surface-secondary)";
                }}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="baseUrl" className="text-[12px]">Base URL</Label>
            <Input
              id="baseUrl"
              placeholder="https://api.openai.com/v1"
              {...register("baseUrl")}
            />
            {errors.baseUrl && (
              <p className="text-[12px]" style={{ color: "var(--status-error)" }}>
                {errors.baseUrl.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apiKey" className="text-[12px]">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-..."
              {...register("apiKey")}
            />
            {errors.apiKey && (
              <p className="text-[12px]" style={{ color: "var(--status-error)" }}>
                {errors.apiKey.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="model" className="text-[12px]">Model</Label>
            <Input
              id="model"
              placeholder="gpt-4o"
              {...register("model")}
            />
            {errors.model && (
              <p className="text-[12px]" style={{ color: "var(--status-error)" }}>
                {errors.model.message}
              </p>
            )}
          </div>

          <Button type="submit" size="sm">保存配置</Button>
        </form>
      </section>

      {/* Danger Zone */}
      <section
        className="rounded-lg p-5"
        style={{
          background: "var(--surface-primary)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <h2
          className="text-[13px] font-semibold mb-3"
          style={{ color: "var(--status-error)" }}
        >
          危险区域
        </h2>
        <p
          className="text-[13px] mb-3"
          style={{ color: "var(--foreground-muted)" }}
        >
          删除你的所有数据，包括项目、面试记录和对话历史。此操作不可逆。
        </p>
        <button
          className="px-2.5 py-1 text-[12px] font-medium rounded transition-colors cursor-pointer"
          style={{
            color: "var(--status-error)",
            background: "var(--status-error-bg)",
            border: "1px solid var(--status-error)",
            opacity: 0.8,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.8"; }}
          onClick={() => setDeleteOpen(true)}
        >
          删除我的所有数据
        </button>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除所有数据？</DialogTitle>
              <DialogDescription>
                此操作不可逆，将删除你的所有项目、面试记录和对话历史。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  try {
                    await deleteUser.mutateAsync();
                    clearAnonymousId();
                    clearLLMConfig();
                    localStorage.removeItem("disclaimer_accepted");
                    regenerateAnonymousId();
                    toast.success("所有数据已删除");
                    window.location.reload();
                  } catch (e) {
                    toast.error("删除失败");
                  }
                }}
              >
                确认删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      <div
        className="flex gap-4 text-[12px] pt-1"
        style={{ color: "var(--foreground-subtle)" }}
      >
        <Link href="/privacy" className="underline hover:opacity-80">
          隐私政策
        </Link>
        <Link href="/disclaimer" className="underline hover:opacity-80">
          免责声明
        </Link>
      </div>
    </div>
  );
}
