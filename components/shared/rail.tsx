"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, FileStack, FlaskConical, Layers, Menu, PenTool, Upload, X } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: BarChart3 },
  { href: "/roles/LCA_CONSULTANT", label: "LCA Consultant", icon: Layers },
  { href: "/roles/UIUX_INTERN", label: "UI/UX Design Intern", icon: PenTool },
  { href: "/candidates", label: "All records", icon: FileStack },
  { href: "/uploads", label: "Upload resume", icon: Upload },
  { href: "/methodology", label: "Methodology", icon: FlaskConical },
];

export function Rail() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between bg-shell px-4 py-3 text-shell-ink lg:hidden">
        <span className="font-bold">Resume Intelligence</span>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="rail"
          className="rounded-control p-2 hover:bg-white/10" aria-label={open ? "Close menu" : "Open menu"}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      <nav id="rail" aria-label="Main"
        className={`${open ? "flex" : "hidden"} w-full flex-col bg-shell text-shell-ink lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-[248px] lg:shrink-0`}>
        <div className="hidden items-center gap-2.5 px-5 pb-6 pt-6 lg:flex">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#2c3d5c" />
            <path d="M8 10h16M8 16h16M8 22h9" stroke="#d6dfec" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="23" cy="22" r="3" fill="#8f6fd6" />
          </svg>
          <span className="text-[15px] font-bold tracking-tight text-white">Resume Intelligence</span>
        </div>
        <ul className="grid gap-0.5 px-3 py-2 lg:py-0">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = path === href || (href !== "/dashboard" && path.startsWith(href));
            return (
              <li key={href}>
                <Link href={href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-control px-3 py-2 text-[14px] font-medium transition-colors ${
                    active ? "bg-white/12 text-white" : "text-shell-ink-dim hover:bg-white/6 hover:text-white"
                  }`}>
                  <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
