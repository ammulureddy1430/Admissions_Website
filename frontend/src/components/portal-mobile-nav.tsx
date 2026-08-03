"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { PehchaanBrand } from "@/components/pehchaan-brand";

type PortalLink = {
  href: string;
  label: string;
};

export function PortalMobileNav({
  subtitle,
  links,
  onLogout,
}: {
  subtitle: string;
  links: PortalLink[];
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-[70] border-b border-[#dbe9e5] bg-white/95 backdrop-blur-xl lg:hidden">
      <div className="flex h-16 items-center justify-between px-4">
        <PehchaanBrand compact subtitle={subtitle} />
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#dbe9e5] bg-white text-[#17304b]"
          aria-expanded={open}
          aria-label={open ? "Close navigation" : "Open navigation"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open ? (
        <div className="absolute inset-x-0 top-16 border-b border-[#dbe9e5] bg-white p-3 shadow-2xl shadow-[#073b32]/10">
          <nav className="grid gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                  pathname === link.href
                    ? "bg-[#e4f8f2] text-[#008f7d]"
                    : "text-[#536475] hover:bg-[#f4f9f7] hover:text-[#008f7d]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={onLogout}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-[#f0d9d7] px-4 py-3 text-sm font-bold text-[#a8463e]"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
