"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Users,
  FileText,
  Mail,
  Settings,
  MapPin,
  BarChart3,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

const navItems = [
  { href: "/usuarios", label: "Usuarios", icon: Users },
  { href: "/novedades", label: "Novedades", icon: FileText },
  { href: "/destinatarios", label: "Destinatarios", icon: Mail },
  { href: "/config-novedades", label: "Configuración", icon: Settings },
  { href: "/sedes", label: "Sedes", icon: MapPin },
]

const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || "#"

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden rounded-md bg-sidebar-bg p-2 text-white shadow-lg"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar-bg text-sidebar-foreground transition-transform duration-300 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex flex-col gap-1.5">
            <img
              src="/logo.png"
              alt="Supertiendas Cañaveral"
              className="h-auto w-full max-w-[180px] brightness-0 invert object-contain"
            />
            <span className="text-[11px] font-medium text-sidebar-muted leading-tight">
              Admin de Novedades Logísticas
            </span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/15 text-sidebar-accent"
                    : "text-sidebar-muted hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            )
          })}

          {/* Dashboard external link */}
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-muted hover:bg-white/10 hover:text-white transition-colors"
          >
            <BarChart3 className="h-5 w-5 shrink-0" />
            Dashboard
            <span className="ml-auto text-xs opacity-60">↗</span>
          </a>
        </nav>

        {/* Bottom */}
        <div className="border-t border-white/10 p-3">
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" })
              window.location.href = "/login"
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-muted hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  )
}
