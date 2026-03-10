"use client"

import { useState, useEffect } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Plus, MoreHorizontal, Pencil, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { DataTable, SortableHeader } from "@/components/ui/data-table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

interface Destinatario {
  rol_codigo: string
  rol_nombre: string
  emails: string[]
  activo: boolean
}

export default function DestinatariosPage() {
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRolCodigo, setEditingRolCodigo] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    rol_nombre: "",
    emailInput: "",
    emails: [] as string[],
  })

  const fetchDestinatarios = async (p: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/destinatarios?page=${p}&pageSize=50`)
      if (res.ok) {
        const data = await res.json()
        setDestinatarios(data.data || [])
        setTotalPages(data.totalPages || 1)
        setTotalCount(data.count || 0)
      }
    } catch {
      toast.error("Error al cargar destinatarios")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDestinatarios(page)
  }, [page])

  const resetForm = () => {
    setEditingRolCodigo(null)
    setFormData({ rol_nombre: "", emailInput: "", emails: [] })
  }

  const openCreate = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEdit = (dest: Destinatario) => {
    setEditingRolCodigo(dest.rol_codigo)
    setFormData({
      rol_nombre: dest.rol_nombre,
      emailInput: "",
      emails: [...dest.emails],
    })
    setIsDialogOpen(true)
  }

  const addEmail = () => {
    const email = formData.emailInput.trim().toLowerCase()
    if (!email) return
    if (!email.includes("@")) {
      toast.error("Email inválido")
      return
    }
    if (formData.emails.includes(email)) {
      toast.error("Email ya agregado")
      return
    }
    setFormData({
      ...formData,
      emailInput: "",
      emails: [...formData.emails, email],
    })
  }

  const removeEmail = (email: string) => {
    setFormData({
      ...formData,
      emails: formData.emails.filter((e) => e !== email),
    })
  }

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addEmail()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.rol_nombre.trim()) {
      toast.error("El nombre del grupo es requerido")
      return
    }

    if (formData.emails.length === 0) {
      toast.error("Agrega al menos un email")
      return
    }

    try {
      if (editingRolCodigo) {
        // PUT
        const res = await fetch(`/api/destinatarios/${encodeURIComponent(editingRolCodigo)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rol_nombre: formData.rol_nombre,
            emails: formData.emails,
          }),
        })

        if (res.ok) {
          toast.success("Grupo actualizado")
          setIsDialogOpen(false)
          fetchDestinatarios(page)
        } else {
          const data = await res.json()
          toast.error(data.error || "Error al actualizar")
        }
      } else {
        // POST
        const res = await fetch("/api/destinatarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rol_nombre: formData.rol_nombre,
            emails: formData.emails,
          }),
        })

        if (res.ok) {
          toast.success("Grupo creado")
          setIsDialogOpen(false)
          fetchDestinatarios(page)
        } else {
          const data = await res.json()
          toast.error(data.error || "Error al crear")
        }
      }
    } catch {
      toast.error("Error de conexión")
    }
  }

  const handleDelete = async (dest: Destinatario) => {
    if (!confirm(`¿Eliminar el grupo "${dest.rol_nombre}"? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      const res = await fetch(`/api/destinatarios/${encodeURIComponent(dest.rol_codigo)}`, {
        method: "DELETE",
      })

      if (res.ok) {
        toast.success("Grupo eliminado")
        fetchDestinatarios(page)
      } else {
        const data = await res.json()
        toast.error(data.error || "Error al eliminar")
      }
    } catch {
      toast.error("Error de conexión")
    }
  }

  const columns: ColumnDef<Destinatario>[] = [
    {
      accessorKey: "rol_nombre",
      header: ({ column }) => <SortableHeader column={column} title="Grupo" />,
      cell: ({ row }) => (
        <span className="font-medium">{row.original.rol_nombre}</span>
      ),
    },
    {
      accessorKey: "emails",
      header: "Emails",
      cell: ({ row }) => (
        <div className="max-w-md">
          {row.original.emails.map((email, i) => (
            <span
              key={i}
              className="inline-block mr-1 mb-1 rounded bg-secondary px-2 py-0.5 text-xs"
            >
              {email}
            </span>
          ))}
        </div>
      ),
    },
    {
      accessorKey: "activo",
      header: "Estado",
      cell: ({ row }) => (
        <Badge variant={row.original.activo ? "success" : "warning"}>
          {row.original.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(row.original)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDelete(row.original)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Grupos de Destinatarios
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gestiona los grupos que reciben notificaciones por email
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Grupo
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRolCodigo ? "Editar Grupo" : "Nuevo Grupo"}
            </DialogTitle>
            <DialogDescription>
              {editingRolCodigo
                ? "Modifica el nombre y los emails del grupo"
                : "Crea un nuevo grupo de destinatarios para notificaciones"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rol_nombre">Nombre del Grupo</Label>
              <Input
                id="rol_nombre"
                placeholder='Ej: "Control Calidad", "Logística"'
                value={formData.rol_nombre}
                onChange={(e) =>
                  setFormData({ ...formData, rol_nombre: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailInput">Emails</Label>
              <div className="flex gap-2">
                <Input
                  id="emailInput"
                  type="email"
                  placeholder="correo@empresa.com"
                  value={formData.emailInput}
                  onChange={(e) =>
                    setFormData({ ...formData, emailInput: e.target.value })
                  }
                  onKeyDown={handleEmailKeyDown}
                />
                <Button type="button" variant="outline" onClick={addEmail}>
                  Agregar
                </Button>
              </div>

              {formData.emails.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {formData.emails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => removeEmail(email)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {formData.emails.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Escribe un email y presiona Enter o clic en Agregar
                </p>
              )}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit">
                {editingRolCodigo ? "Actualizar" : "Crear Grupo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DataTable
        columns={columns}
        data={destinatarios}
        isLoading={loading}
        searchKey="rol_nombre"
        searchPlaceholder="Buscar grupo..."
        page={page}
        pageSize={50}
        totalCount={totalCount}
        onPageChange={setPage}
      />
    </div>
  )
}
