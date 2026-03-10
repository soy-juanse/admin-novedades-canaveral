"use client"

import { useState, useEffect } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Plus, Pencil, Trash2, MoreHorizontal } from "lucide-react"
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
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

interface Sede {
  codigo: string
  nombre: string
  tipo: string
}

export default function SedesPage() {
  const [sedes, setSedes] = useState<Sede[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 10

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    tipo: "",
  })

  const fetchSedes = async (pageNum: number, search: string = "") => {
    setLoading(true)
    try {
      const query = new URLSearchParams({
        page: pageNum.toString(),
        pageSize: pageSize.toString(),
        ...(search && { search }),
      })
      const res = await fetch(`/api/sedes?${query}`)
      if (res.ok) {
        const data = await res.json()
        setSedes(data.data || [])
        setTotalCount(data.count || 0)
      }
    } catch (error) {
      toast.error("Error al cargar sedes")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSedes(page)
  }, [page])

  const handleOpenDialog = (sede?: Sede) => {
    if (sede) {
      setEditingCode(sede.codigo)
      setFormData({
        codigo: sede.codigo,
        nombre: sede.nombre,
        tipo: sede.tipo,
      })
    } else {
      setEditingCode(null)
      setFormData({
        codigo: "",
        nombre: "",
        tipo: "",
      })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.codigo || !formData.nombre || !formData.tipo) {
      toast.error("Por favor completa todos los campos requeridos")
      return
    }

    try {
      const method = editingCode ? "PUT" : "POST"
      const endpoint = editingCode ? `/api/sedes/${editingCode}` : "/api/sedes"

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        toast.success(editingCode ? "Sede actualizada" : "Sede creada")
        setIsDialogOpen(false)
        fetchSedes(page)
      } else {
        const data = await res.json()
        toast.error(data.error || "Error al guardar sede")
      }
    } catch (error) {
      toast.error("Error de conexión")
    }
  }

  const handleDelete = async (codigo: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta sede?")) return

    try {
      const res = await fetch(`/api/sedes/${codigo}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Sede eliminada")
        fetchSedes(page)
      } else {
        toast.error("Error al eliminar sede")
      }
    } catch (error) {
      toast.error("Error de conexión")
    }
  }

  const columns: ColumnDef<Sede>[] = [
    {
      accessorKey: "codigo",
      header: ({ column }) => <SortableHeader column={column} title="Código" />,
    },
    {
      accessorKey: "nombre",
      header: ({ column }) => <SortableHeader column={column} title="Nombre" />,
    },
    {
      accessorKey: "tipo",
      header: "Tipo",
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
            <DropdownMenuItem
              onClick={() => handleOpenDialog(row.original)}
              className="flex items-center gap-2"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleDelete(row.original.codigo)}
              className="text-destructive flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
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
          <h1 className="text-3xl font-bold text-foreground">Sedes</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gestiona las sedes de la empresa
          </p>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Sede
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCode ? "Editar Sede" : "Nueva Sede"}</DialogTitle>
            <DialogDescription>
              {editingCode ? "Actualiza los datos de la sede" : "Crea una nueva sede"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                placeholder="Código de la sede"
                value={formData.codigo}
                onChange={(e) =>
                  setFormData({ ...formData, codigo: e.target.value })
                }
                disabled={!!editingCode}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                placeholder="Nombre de la sede"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Input
                id="tipo"
                placeholder="Tipo de sede"
                value={formData.tipo}
                onChange={(e) =>
                  setFormData({ ...formData, tipo: e.target.value })
                }
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit">{editingCode ? "Actualizar" : "Crear"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DataTable
        columns={columns}
        data={sedes}
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setPage}
        isLoading={loading}
        searchKey="nombre"
        searchPlaceholder="Buscar por nombre..."
      />
    </div>
  )
}
