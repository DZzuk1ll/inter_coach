"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLLMConfig } from "@/hooks/use-llm-config";

const NAV_ITEMS = [
  { href: "/", label: "首页" },
  { href: "/history", label: "历史" },
  { href: "/settings", label: "设置" },
];

export function Header() {
  const pathname = usePathname();
  const { configured } = useLLMConfig();

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold">
          InterviewCoach
        </Link>

        <nav className="flex items-center gap-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm ${
                pathname === item.href
                  ? "font-medium text-black"
                  : "text-gray-500 hover:text-black"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <span
            className={`h-2 w-2 rounded-full ${
              configured ? "bg-green-500" : "bg-red-500"
            }`}
            title={configured ? "LLM 已配置" : "LLM 未配置"}
          />
        </nav>
      </div>
    </header>
  );
}
