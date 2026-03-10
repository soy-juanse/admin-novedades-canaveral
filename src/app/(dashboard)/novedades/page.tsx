"use client"

import { useState, useEffect } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { RefreshCw, Trash2, MoreHorizontal, Eye } from "lucide-react"
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
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"

interface Novedad {
  id: string
  usuario_id: string
  sede_codigo: number
  ean_producto: string | null
  usuario_email: string | null
  usuario_nombre: string | null
  usuario_documento: string | null
  sede_nombre: string | null
  producto_descripcion: string | null
  origen: string | null
  categoria: string | null
  novedad_tipo: string | null
  codigo_manual: string | null
  cantidad: number | null
  foto_producto_url: string | null
  foto_documento_url: string | null
  comentario: string | null
  estado: string | null
  prioridad: string | null
  asignado_a: string | null
  fecha_resolucion: string | null
  resolucion_comentario: string | null
  offline_id: string | null
  created_at: string
  synced_at: string | null
  proveedor_nombre: string | null
}

export default function NovedadesPage() {
  const [novedades, setNovedades] = useState<Novedad[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 10

  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [estadoDialogOpen, setEstadoDialogOpen] = useState(false)
  const [selectedNovedad, setSelectedNovedad] = useState<Novedad | null>(null)
  const [nuevoEstado, setNuevoEstado] = useState("")

  const fetchNovedades = async (pageNum: number, search: string = "") => {
    setLoading(true)
    try {
      const query = new URLSearchParams({
        page: pageNum.toString(),
        pageSize: pageSize.toString(),
        ...(search && { search }),
      })
      const res = await fetch(`/api/novedades?${query}`)
      if (res.ok) {
        const data = await res.json()
        setNovedades(data.data || [])
        setTotalCount(data.count || 0)
      }
    } catch {
      toast.error("Error al cargar novedades")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNovedades(page)
  }, [page])

  const handleOpenView = (novedad: Novedad) => {
    setSelectedNovedad(novedad)
    setViewDialogOpen(true)
  }

  const handleOpenEstado = (novedad: Novedad) => {
    setSelectedNovedad(novedad)
    setNuevoEstado(novedad.estado || "")
    setEstadoDialogOpen(true)
  }

  const handleUpdateEstado = async () => {
    if (!selectedNovedad) return

    try {
      const res = await fetch(`/api/novedades/${selectedNovedad.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      })

      if (res.ok) {
        toast.success("Estado actualizado")
        setEstadoDialogOpen(false)
        fetchNovedades(page)
      } else {
        const data = await res.json()
        toast.error(data.error || "Error al actualizar")
      }
    } catch {
      toast.error("Error de conexión")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta novedad?")) return

    try {
      const res = await fetch(`/api/novedades/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Novedad eliminada")
        fetchNovedades(page)
      } else {
        toast.error("Error al eliminar novedad")
      }
    } catch {
      toast.error("Error de conexión")
    }
  }

  const getEstadoBadgeVariant = (estado: string | null) => {
    switch (estado) {
      case "RESUELTO":
      case "CERRADO":
        return "success"
      case "PENDIENTE":
        return "warning"
      case "EN_REVISION":
        return "secondary"
      default:
        return "warning"
    }
  }

  const columns: ColumnDef<Novedad>[] = [
    {
      accessorKey: "created_at",
      header: ({ column }) => <SortableHeader column={column} title="Fecha" />,
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      accessorKey: "usuario_nombre",
      header: "Usuario",
    },
    {
      accessorKey: "sede_nombre",
      header: "Sede",
    },
    {
      accessorKey: "origen",
      header: "Origen",
    },
    {
      accessorKey: "categoria",
      header: "Categoría",
    },
    {
      accessorKey: "novedad_tipo",
      header: "Tipo",
    },
    {
      accessorKey: "producto_descripcion",
      header: "Producto",
      cell: ({ row }) => (
        <span className="max-w-xs truncate block">
          {row.original.producto_descripcion || "—"}
        </span>
      ),
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: ({ row }) => (
        <Badge variant={getEstadoBadgeVariant(row.original.estado)}>
          {row.original.estado || "Sin estado"}
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
            <DropdownMenuItem
              onClick={() => handleOpenView(row.original)}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Ver Detalles
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleOpenEstado(row.original)}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Cambiar Estado
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleDelete(row.original.id)}
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
          <h1 className="text-3xl font-bold text-foreground">Novedades</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gestiona las novedades logísticas registradas
          </p>
        </div>
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la Novedad</DialogTitle>
          </DialogHeader>

          {selectedNovedad && (
            <div className="space-y-4">
              {/* Fotos */}
              {(selectedNovedad.foto_producto_url || selectedNovedad.foto_documento_url) && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {selectedNovedad.foto_producto_url && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Foto Producto</p>
                      <img
                        src={selectedNovedad.foto_producto_url}
                        alt="Producto"
                        className="max-h-64 w-full rounded-md object-cover"
                      />
                    </div>
                  )}
                  {selectedNovedad.foto_documento_url && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Foto Documento</p>
                      <img
                        src={selectedNovedad.foto_documento_url}
                        alt="Documento"
                        className="max-h-64 w-full rounded-md object-cover"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Fecha</p>
                  <p className="text-foreground">{formatDate(selectedNovedad.created_at)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Usuario</p>
                  <p className="text-foreground">{selectedNovedad.usuario_nombre || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Sede</p>
                  <p className="text-foreground">{selectedNovedad.sede_nombre || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Origen</p>
                  <p className="text-foreground">{selectedNovedad.origen || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Categoría</p>
                  <p className="text-foreground">{selectedNovedad.categoria || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Tipo Novedad</p>
                  <p className="text-foreground">{selectedNovedad.novedad_tipo || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">EAN</p>
                  <p className="text-foreground">{selectedNovedad.ean_producto || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Cantidad</p>
                  <p className="text-foreground">{selectedNovedad.cantidad ?? "—"}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Producto</p>
                <p className="text-foreground">{selectedNovedad.producto_descripcion || "—"}</p>
              </div>

              {selectedNovedad.proveedor_nombre && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Proveedor</p>
                  <p className="text-foreground">{selectedNovedad.proveedor_nombre}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Estado</p>
                  <Badge variant={getEstadoBadgeVariant(selectedNovedad.estado)}>
                    {selectedNovedad.estado || "Sin estado"}
                  </Badge>
                </div>
                {selectedNovedad.prioridad && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Prioridad</p>
                    <p className="text-foreground">{selectedNovedad.prioridad}</p>
                  </div>
                )}
              </div>

              {selectedNovedad.comentario && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Comentario</p>
                  <p className="text-foreground">{selectedNovedad.comentario}</p>
                </div>
              )}

              {selectedNovedad.resolucion_comentario && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Resolución</p>
                  <p className="text-foreground">{selectedNovedad.resolucion_comentario}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cerrar
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Estado Dialog */}
      <Dialog open={estadoDialogOpen} onOpenChange={setEstadoDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cambiar Estado</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={nuevoEstado} onValueChange={setNuevoEstado}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="EN_REVISION">En Revisión</SelectItem>
                <SelectItem value="RESUELTO">Resuelto</SelectItem>
                <SelectItem value="CERRADO">Cerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button onClick={handleUpdateEstado}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DataTable
        columns={columns}
        data={novedades}
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setPage}
        isLoading={loading}
        searchKey="producto_descripcion"
        searchPlaceholder="Buscar por producto..."
      />
    </div>
  )
}
