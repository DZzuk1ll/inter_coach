"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "disclaimer_accepted";

interface DisclaimerDialogProps {
  onAccepted: () => void;
}

export function DisclaimerDialog({ onAccepted }: DisclaimerDialogProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(STORAGE_KEY);
    if (!accepted) {
      setOpen(true);
    } else {
      onAccepted();
    }
  }, [onAccepted]);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
    onAccepted();
  };

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>使用须知</DialogTitle>
          <DialogDescription>
            请在使用前阅读以下内容：
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm space-y-2 text-gray-600">
          <p>1. 请勿上传包含公司商业秘密或受保密协议约束的代码。</p>
          <p>2. 代码内容将发送至您配置的第三方 LLM API 处理。</p>
          <p>3. AI 面试官的评估仅供参考，不代表真实面试结果。</p>
          <p>4. AI 生成内容可能存在错误。</p>
        </div>
        <DialogFooter>
          <Button onClick={handleAccept}>我已了解</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
