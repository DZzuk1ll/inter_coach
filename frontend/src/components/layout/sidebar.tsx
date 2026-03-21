"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Home,
  Clock,
  Settings,
  Sun,
  Moon,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  X,
} from "lucide-react";
import { useSidebar } from "@/contexts/sidebar-context";
import { useLLMConfig } from "@/hooks/use-llm-config";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "首页", icon: Home },
  { href: "/history", label: "历史", icon: Clock },
  { href: "/settings", label: "设置", icon: Settings },
];

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  collapsed: boolean;
}) {
  const inner = (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
        active
          ? "text-[--sidebar-item-fg-active]"
          : "text-[--sidebar-item-fg] hover:bg-[--sidebar-item-hover] hover:text-[--sidebar-item-fg-active]",
      )}
      style={{
        background: active ? "var(--sidebar-item-active-bg)" : undefined,
      }}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-r"
          style={{ background: "var(--sidebar-item-active-border)" }}
        />
      )}
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={<div />}>{inner}</TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    );
  }

  return inner;
}

export function Sidebar() {
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebar();
  const { configured } = useLLMConfig();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const sidebarWidth = collapsed
    ? "var(--sidebar-width-collapsed)"
    : "var(--sidebar-width-expanded)";

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="fixed top-3 left-3 z-50 flex h-8 w-8 items-center justify-center rounded-md md:hidden"
        style={{
          background: "var(--surface-primary)",
          border: "1px solid var(--border-subtle)",
          color: "var(--foreground-muted)",
        }}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "sidebar-transition fixed top-0 left-0 z-40 flex h-screen flex-col",
          "max-md:translate-x-[-100%] max-md:w-[--sidebar-width-expanded]",
          mobileOpen && "max-md:translate-x-0",
        )}
        style={{
          width: sidebarWidth,
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
          transition: "width 200ms ease, transform 200ms ease",
        }}
      >
        {/* Top: Logo */}
        <div
          className="flex h-11 items-center shrink-0 px-3"
          style={{ borderBottom: "1px solid var(--sidebar-border)" }}
        >
          <Link
            href="/"
            className="flex items-center gap-2 text-[13px] font-semibold tracking-tight overflow-hidden"
            style={{ color: "var(--foreground)" }}
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-bold"
              style={{
                background: "var(--accent-bg-strong)",
                color: "var(--accent-fg)",
              }}
            >
              IC
            </span>
            {!collapsed && <span className="truncate">InterviewCoach</span>}
          </Link>
        </div>

        {/* Middle: Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(item.href)}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {/* Bottom: Status + Theme + Collapse */}
        <div
          className="shrink-0 px-2 py-2 space-y-1"
          style={{ borderTop: "1px solid var(--sidebar-border)" }}
        >
          {/* LLM status */}
          <div
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-1.5",
              collapsed && "justify-center",
            )}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
              style={{
                background: configured
                  ? "var(--status-success)"
                  : "var(--status-error)",
              }}
            />
            {!collapsed && (
              <span
                className="text-[11px]"
                style={{ color: "var(--foreground-subtle)" }}
              >
                {configured ? "LLM 已连接" : "LLM 未配置"}
              </span>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
              "text-[--sidebar-item-fg] hover:bg-[--sidebar-item-hover] hover:text-[--sidebar-item-fg-active]",
              collapsed && "justify-center",
            )}
            aria-label="Toggle theme"
          >
            <Sun className="hidden h-4 w-4 shrink-0 dark:block" />
            <Moon className="block h-4 w-4 shrink-0 dark:hidden" />
            {!collapsed && <span>切换主题</span>}
          </button>

          {/* Collapse toggle (hidden on mobile) */}
          <button
            onClick={toggle}
            className={cn(
              "hidden md:flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
              "text-[--sidebar-item-fg] hover:bg-[--sidebar-item-hover] hover:text-[--sidebar-item-fg-active]",
              collapsed && "justify-center",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4 shrink-0" />
                <span>收起</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
