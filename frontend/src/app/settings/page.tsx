"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { useLLMConfig } from "@/hooks/use-llm-config";
import { useDeleteUser } from "@/hooks/use-user";
import { clearAnonymousId, regenerateAnonymousId } from "@/lib/auth";
import { clearLLMConfig, LLM_PRESETS } from "@/lib/llm-config";
import type { LLMConfig } from "@/types";

export default function SettingsPage() {
  const { config, save } = useLLMConfig();
  const deleteUser = useDeleteUser();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LLMConfig>();

  useEffect(() => {
    if (config) {
      setValue("baseUrl", config.baseUrl);
      setValue("apiKey", config.apiKey);
      setValue("model", config.model);
    }
  }, [config, setValue]);

  const onSubmit = (data: LLMConfig) => {
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
      <h1 className="text-2xl font-bold">设置</h1>

      <Card>
        <CardHeader>
          <CardTitle>LLM 配置</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {Object.keys(LLM_PRESETS).map((name) => (
                <Button
                  key={name}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(name)}
                >
                  {name}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                placeholder="https://api.openai.com/v1"
                {...register("baseUrl", { required: "Base URL 不能为空" })}
              />
              {errors.baseUrl && (
                <p className="text-sm text-red-500">{errors.baseUrl.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk-..."
                {...register("apiKey", { required: "API Key 不能为空" })}
              />
              {errors.apiKey && (
                <p className="text-sm text-red-500">{errors.apiKey.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                placeholder="gpt-4o"
                {...register("model", { required: "Model 不能为空" })}
              />
              {errors.model && (
                <p className="text-sm text-red-500">{errors.model.message}</p>
              )}
            </div>

            <Button type="submit">保存配置</Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">危险区域</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            删除你的所有数据，包括项目、面试记录和对话历史。此操作不可逆。
          </p>
          <Button
            variant="outline"
            className="text-red-600 border-red-300 hover:bg-red-50"
            onClick={() => setDeleteOpen(true)}
          >
            删除我的所有数据
          </Button>

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
                  variant="outline"
                  className="text-red-600"
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
        </CardContent>
      </Card>

      <div className="flex gap-4 text-sm text-gray-500">
        <Link href="/privacy" className="underline hover:text-gray-700">
          隐私政策
        </Link>
        <Link href="/disclaimer" className="underline hover:text-gray-700">
          免责声明
        </Link>
      </div>
    </div>
  );
}
