"use client"

import { useState, useEffect } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Pencil, MoreHorizontal } from "lucide-react"
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
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

interface ConfigNovedad {
  id: string
  origen: string
  categoria: string
  tipo_novedad: string
  destinatarios: string
  activo: boolean
}

export default function ConfigNovedadesPage() {
  const [configs, setConfigs] = useState<ConfigNovedad[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 10

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<ConfigNovedad | null>(null)
  const [formData, setFormData] = useState({
    destinatarios: "",
    activo: true,
  })

  const fetchConfigs = async (pageNum: number, search: string = "") => {
    setLoading(true)
    try {
      const query = new URLSearchParams({
        page: pageNum.toString(),
        pageSize: pageSize.toString(),
        ...(search && { search }),
      })
      const res = await fetch(`/api/config-novedades?${query}`)
      if (res.ok) {
        const data = await res.json()
        setConfigs(data.data || [])
        setTotalCount(data.count || 0)
      }
    } catch (error) {
      toast.error("Error al cargar configuraciones")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigs(page)
  }, [page])

  const handleOpenDialog = (config: ConfigNovedad) => {
    setSelectedConfig(config)
    setFormData({
      destinatarios: config.destinatarios,
      activo: config.activo,
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedConfig) return

    try {
      const res = await fetch(`/api/config-novedades/${selectedConfig.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinatarios: formData.destinatarios,
          activo: formData.activo,
        }),
      })

      if (res.ok) {
        toast.success("Configuración actualizada")
        setIsDialogOpen(false)
        fetchConfigs(page)
      } else {
        const data = await res.json()
        toast.error(data.error || "Error al actualizar configuración")
      }
    } catch (error) {
      toast.error("Error de conexión")
    }
  }

  const columns: ColumnDef<ConfigNovedad>[] = [
    {
      accessorKey: "origen",
      header: ({ column }) => <SortableHeader column={column} title="Origen" />,
    },
    {
      accessorKey: "categoria",
      header: ({ column }) => <SortableHeader column={column} title="Categoría" />,
    },
    {
      accessorKey: "tipo_novedad",
      header: "Tipo Novedad",
    },
    {
      accessorKey: "destinatarios",
      header: "Destinatarios",
      cell: ({ row }) => (
        <span className="max-w-xs truncate text-sm">{row.original.destinatarios}</span>
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
            <DropdownMenuItem
              onClick={() => handleOpenDialog(row.original)}
              className="flex items-center gap-2"
            >
              <Pencil className="h-4 w-4" />
              Editar
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
          <h1 className="text-3xl font-bold text-foreground">Configuración de Novedades</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Configura los destinatarios para cada tipo de novedad
          </p>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Configuración</DialogTitle>
            <DialogDescription>
              Actualiza los destinatarios y estado de esta configuración
            </DialogDescription>
          </DialogHeader>

          {selectedConfig && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Origen
                </Label>
                <Badge variant="outline">{selectedConfig.origen}</Badge>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Categoría
                </Label>
                <Badge variant="outline">{selectedConfig.categoria}</Badge>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Tipo de Novedad
                </Label>
                <Badge variant="outline">{selectedConfig.tipo_novedad}</Badge>
              </div>

              <div className="space-y-2">
                <Label htmlFor="destinatarios">Destinatarios</Label>
                <Input
                  id="destinatarios"
                  placeholder="Correos separados por comas"
                  value={formData.destinatarios}
                  onChange={(e) =>
                    setFormData({ ...formData, destinatarios: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Ingresa los emails separados por comas (,)
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-input bg-background px-3 py-2">
                <Label htmlFor="activo" className="cursor-pointer">
                  Activo
                </Label>
                <Switch
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, activo: checked })
                  }
                />
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit">Actualizar</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <DataTable
        columns={columns}
        data={configs}
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setPage}
        isLoading={loading}
        searchKey="origen"
        searchPlaceholder="Buscar por origen..."
      />
    </div>
  )
}
