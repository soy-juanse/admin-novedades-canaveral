"use client"

import { usePathname } from "next/navigation"
import { User } from "lucide-react"

const pageTitles: Record<string, string> = {
  "/usuarios": "Usuarios",
  "/novedades": "Novedades",
  "/destinatarios": "Destinatarios Email",
  "/config-novedades": "Configuración de Novedades",
  "/sedes": "Sedes",
}

interface HeaderProps {
  userName?: string
}

export function Header({ userName = "Admin" }: HeaderProps) {
  const pathname = usePathname()
  const title = pageTitles[pathname] || "Panel Administrativo"

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-white px-6 lg:px-8">
      <div className="lg:ml-0 ml-12">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{userName}</span>
        </div>
      </div>
    </header>
  )
}
