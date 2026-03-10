"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { useEffect, useState } from "react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [userName, setUserName] = useState("Admin")

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user?.nombre) {
          setUserName(data.user.nombre)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userName={userName} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
