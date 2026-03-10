"use client"

import { useState, useEffect, useCallback } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Pencil, ChevronDown, ChevronRight, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

interface ConfigNovedad {
  id: number
  origen: string
  categoria: string
  novedad_tipo: string
  destinatarios: string[] | null
  activo: boolean
}

interface Grupo {
  rol_codigo: string
  rol_nombre: string
}

interface TreeNode {
  origen: string
  categorias: {
    categoria: string
    tipos: { id: number; novedad_tipo: string }[]
  }[]
}

function buildTree(configs: ConfigNovedad[]): TreeNode[] {
  const origenes: Record<string, Record<string, { id: number; novedad_tipo: string }[]>> = {}

  for (const c of configs) {
    if (!origenes[c.origen]) origenes[c.origen] = {}
    if (!origenes[c.origen][c.categoria]) origenes[c.origen][c.categoria] = []
    origenes[c.origen][c.categoria].push({ id: c.id, novedad_tipo: c.novedad_tipo })
  }

  const origenOrder = ["FACTURA", "TRASLADO", "INVENTARIO"]

  return origenOrder
    .filter((o) => origenes[o])
    .map((origen) => ({
      origen,
      categorias: Object.keys(origenes[origen])
        .sort()
        .map((categoria) => ({
          categoria,
          tipos: origenes[origen][categoria].sort((a, b) =>
            a.novedad_tipo.localeCompare(b.novedad_tipo)
          ),
        })),
    }))
}

function ConfigurarGrupo({ onSaved }: { onSaved: () => void }) {
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [configs, setConfigs] = useState<ConfigNovedad[]>([])
  const [tree, setTree] = useState<TreeNode[]>([])
  const [selectedGrupo, setSelectedGrupo] = useState<string>("")
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [collapsedOrigenes, setCollapsedOrigenes] = useState<Set<string>>(new Set())
  const [collapsedCategorias, setCollapsedCategorias] = useState<Set<string>>(new Set())

  const fetchTree = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/config-novedades?mode=tree")
      if (res.ok) {
        const data = await res.json()
        setConfigs(data.configs || [])
        setGrupos(data.grupos || [])
        setTree(buildTree(data.configs || []))
      }
    } catch {
      toast.error("Error al cargar configuración")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTree()
  }, [fetchTree])

  // Cuando cambia el grupo seleccionado, cargar sus checkboxes
  useEffect(() => {
    if (!selectedGrupo || configs.length === 0) {
      setCheckedIds(new Set())
      return
    }
    const checked = new Set<number>()
    for (const c of configs) {
      const dest: string[] = c.destinatarios || []
      if (dest.includes(selectedGrupo)) {
        checked.add(c.id)
      }
    }
    setCheckedIds(checked)
  }, [selectedGrupo, configs])

  const toggleId = (id: number) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleCategoria = (tipos: { id: number }[]) => {
    const ids = tipos.map((t) => t.id)
    const allChecked = ids.every((id) => checkedIds.has(id))
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (allChecked) {
        ids.forEach((id) => next.delete(id))
      } else {
        ids.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const toggleOrigen = (node: TreeNode) => {
    const ids = node.categorias.flatMap((c) => c.tipos.map((t) => t.id))
    const allChecked = ids.every((id) => checkedIds.has(id))
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (allChecked) {
        ids.forEach((id) => next.delete(id))
      } else {
        ids.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const toggleCollapseOrigen = (origen: string) => {
    setCollapsedOrigenes((prev) => {
      const next = new Set(prev)
      if (next.has(origen)) next.delete(origen)
      else next.add(origen)
      return next
    })
  }

  const toggleCollapseCategoria = (key: string) => {
    setCollapsedCategorias((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSave = async () => {
    if (!selectedGrupo) {
      toast.error("Selecciona un grupo primero")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/config-novedades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rol_codigo: selectedGrupo,
          config_ids: Array.from(checkedIds),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(data.message || "Configuración guardada")
        await fetchTree()
        onSaved()
      } else {
        const data = await res.json()
        toast.error(data.error || "Error al guardar")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  const totalConfigs = configs.length
  const checkedCount = checkedIds.size

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">Cargando configuración...</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Configurar Grupo</h2>
          <p className="text-sm text-muted-foreground">
            Selecciona un grupo y marca los tipos de novedad que debe recibir
          </p>
        </div>
      </div>

      <div className="flex items-end gap-4">
        <div className="w-72 space-y-1">
          <Label>Grupo de Destinatarios</Label>
          <div className="flex items-center gap-2">
            <Select value={selectedGrupo} onValueChange={setSelectedGrupo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un grupo..." />
              </SelectTrigger>
              <SelectContent>
                {grupos.map((g) => (
                  <SelectItem key={g.rol_codigo} value={g.rol_codigo}>
                    {g.rol_nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedGrupo && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedGrupo("")}
                title="Limpiar selección"
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {selectedGrupo && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {checkedCount} de {totalConfigs} seleccionados
            </span>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        )}
      </div>

      {selectedGrupo && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {tree.map((node) => {
            const origenIds = node.categorias.flatMap((c) => c.tipos.map((t) => t.id))
            const origenChecked = origenIds.filter((id) => checkedIds.has(id)).length
            const origenTotal = origenIds.length
            const isOrigenCollapsed = collapsedOrigenes.has(node.origen)

            return (
              <div key={node.origen} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCollapseOrigen(node.origen)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {isOrigenCollapsed ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={origenChecked === origenTotal}
                      ref={(el) => {
                        if (el) el.indeterminate = origenChecked > 0 && origenChecked < origenTotal
                      }}
                      onChange={() => toggleOrigen(node)}
                      className="h-4 w-4 rounded accent-[#1c5a2a]"
                    />
                    <span className="font-semibold text-sm">{node.origen}</span>
                    <span className="text-xs text-muted-foreground">
                      ({origenChecked}/{origenTotal})
                    </span>
                  </label>
                </div>

                {!isOrigenCollapsed &&
                  node.categorias.map((cat) => {
                    const catKey = `${node.origen}-${cat.categoria}`
                    const catIds = cat.tipos.map((t) => t.id)
                    const catChecked = catIds.filter((id) => checkedIds.has(id)).length
                    const catTotal = catIds.length
                    const isCatCollapsed = collapsedCategorias.has(catKey)

                    return (
                      <div key={catKey} className="ml-6 space-y-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleCollapseCategoria(catKey)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {isCatCollapsed ? (
                              <ChevronRight className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>
                          <label className="flex items-center gap-2 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={catChecked === catTotal}
                              ref={(el) => {
                                if (el) el.indeterminate = catChecked > 0 && catChecked < catTotal
                              }}
                              onChange={() => toggleCategoria(cat.tipos)}
                              className="h-3.5 w-3.5 rounded accent-[#1c5a2a]"
                            />
                            <span className="text-sm font-medium text-muted-foreground">
                              {cat.categoria}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({catChecked}/{catTotal})
                            </span>
                          </label>
                        </div>

                        {!isCatCollapsed &&
                          cat.tipos.map((tipo) => (
                            <label
                              key={tipo.id}
                              className="ml-6 flex items-center gap-2 cursor-pointer py-0.5"
                            >
                              <input
                                type="checkbox"
                                checked={checkedIds.has(tipo.id)}
                                onChange={() => toggleId(tipo.id)}
                                className="h-3.5 w-3.5 rounded accent-[#1c5a2a]"
                              />
                              <span className="text-xs">{tipo.novedad_tipo}</span>
                            </label>
                          ))}
                      </div>
                    )
                  })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface ConfigRow {
  id: string
  origen: string
  categoria: string
  novedad_tipo: string
  destinatarios: string[] | string | null
  activo: boolean
}

export default function ConfigNovedadesPage() {
  const [configs, setConfigs] = useState<ConfigRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 10

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<ConfigRow | null>(null)
  const [formActivo, setFormActivo] = useState(true)

  const fetchConfigs = async (pageNum: number) => {
    setLoading(true)
    try {
      const query = new URLSearchParams({
        page: pageNum.toString(),
        pageSize: pageSize.toString(),
      })
      const res = await fetch(`/api/config-novedades?${query}`)
      if (res.ok) {
        const data = await res.json()
        setConfigs(data.data || [])
        setTotalCount(data.count || 0)
      }
    } catch {
      toast.error("Error al cargar configuraciones")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigs(page)
  }, [page])

  const handleOpenDialog = (config: ConfigRow) => {
    setSelectedConfig(config)
    setFormActivo(config.activo)
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedConfig) return

    try {
      const res = await fetch(`/api/config-novedades/${selectedConfig.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: formActivo }),
      })

      if (res.ok) {
        toast.success("Configuración actualizada")
        setIsDialogOpen(false)
        fetchConfigs(page)
      } else {
        const data = await res.json()
        toast.error(data.error || "Error al actualizar")
      }
    } catch {
      toast.error("Error de conexión")
    }
  }

  const formatDestinatarios = (dest: string[] | string | null): string => {
    if (!dest) return "—"
    if (Array.isArray(dest)) return dest.join(", ")
    return String(dest)
  }

  const columns: ColumnDef<ConfigRow>[] = [
    {
      accessorKey: "origen",
      header: ({ column }) => <SortableHeader column={column} title="Origen" />,
    },
    {
      accessorKey: "categoria",
      header: ({ column }) => <SortableHeader column={column} title="Categoría" />,
    },
    {
      accessorKey: "novedad_tipo",
      header: "Tipo Novedad",
    },
    {
      accessorKey: "destinatarios",
      header: "Destinatarios",
      cell: ({ row }) => {
        const dest = row.original.destinatarios
        const items = Array.isArray(dest) ? dest : []
        if (items.length === 0) return <span className="text-muted-foreground">—</span>
        return (
          <div className="max-w-xs">
            {items.map((d, i) => (
              <span
                key={i}
                className="inline-block mr-1 mb-1 rounded bg-secondary px-2 py-0.5 text-xs"
              >
                {d}
              </span>
            ))}
          </div>
        )
      },
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
              Editar Estado
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configuración de Novedades</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Configura los destinatarios para cada tipo de novedad
        </p>
      </div>

      <ConfigurarGrupo onSaved={() => fetchConfigs(page)} />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Estado</DialogTitle>
            <DialogDescription>
              Activa o desactiva este tipo de novedad
            </DialogDescription>
          </DialogHeader>

          {selectedConfig && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-muted-foreground">Tipo</Label>
                <p className="text-sm">
                  {selectedConfig.origen} → {selectedConfig.categoria} → {selectedConfig.novedad_tipo}
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-muted-foreground">Destinatarios</Label>
                <p className="text-xs text-muted-foreground">
                  {formatDestinatarios(selectedConfig.destinatarios)}
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-input bg-background px-3 py-2">
                <Label htmlFor="activo" className="cursor-pointer">
                  Activo
                </Label>
                <Switch
                  id="activo"
                  checked={formActivo}
                  onCheckedChange={setFormActivo}
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
        searchKey="novedad_tipo"
        searchPlaceholder="Buscar tipo de novedad..."
      />
    </div>
  )
}
