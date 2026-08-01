"use client"

import { useState, useEffect } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Plus, Pencil, UserX, UserCheck, MoreHorizontal, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

interface Usuario {
  id: string
  documento: string
  email: string
  nombre: string
  cargo: string
  rol: string
  sede_codigo: string
  sedes?: string[]
  sede_nombre?: string
  activo: boolean
}

interface Sede {
  codigo: string
  nombre: string
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const pageSize = 10

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    documento: "",
    email: "",
    nombre: "",
    cargo: "",
    rol: "AUXILIAR",
    sede_codigo: "",
    sedes_adicionales: [] as string[],
    password: "",
  })

  const fetchSedes = async () => {
    try {
      const res = await fetch("/api/sedes?page=1&pageSize=100")
      if (res.ok) {
        const data = await res.json()
        setSedes(data.data || [])
      }
    } catch (error) {
      console.error("Error fetching sedes:", error)
    }
  }

  const fetchUsuarios = async (pageNum: number, search: string = "") => {
    setLoading(true)
    try {
      const query = new URLSearchParams({
        page: pageNum.toString(),
        pageSize: pageSize.toString(),
        ...(search && { search }),
      })
      const res = await fetch(`/api/usuarios?${query}`)
      if (res.ok) {
        const data = await res.json()
        setUsuarios(data.data || [])
        setTotalCount(data.count || 0)
      }
    } catch (error) {
      toast.error("Error al cargar usuarios")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSedes()
  }, [])

  // Debounce del término; al cambiar la búsqueda, vuelve a la página 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  // Búsqueda server-side: el término va como query param al GET (filtra ANTES
  // de paginar), así encuentra en TODAS las páginas. Sin término = lista completa.
  useEffect(() => {
    fetchUsuarios(page, debouncedSearch)
  }, [page, debouncedSearch])

  const handleOpenDialog = (usuario?: Usuario) => {
    setShowPassword(false)
    if (usuario) {
      setEditingId(usuario.id)
      setFormData({
        documento: usuario.documento,
        email: usuario.email,
        nombre: usuario.nombre,
        cargo: usuario.cargo,
        rol: usuario.rol,
        // Códigos normalizados a string (D-e): la columna es TEXT, pero blindamos
        // Select/checkboxes/filtros para que operen todos en el mismo tipo.
        sede_codigo: String(usuario.sede_codigo),
        // Adicionales = todas las sedes menos la principal.
        sedes_adicionales: (usuario.sedes || []).map(String).filter((c) => c !== String(usuario.sede_codigo)),
        password: "",
      })
    } else {
      setEditingId(null)
      setFormData({
        documento: "",
        email: "",
        nombre: "",
        cargo: "",
        rol: "AUXILIAR",
        sede_codigo: "",
        sedes_adicionales: [],
        password: "",
      })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.documento || !formData.email || !formData.nombre || !formData.cargo || !formData.sede_codigo) {
      toast.error("Por favor completa todos los campos requeridos")
      return
    }

    // Si es ADMIN nuevo, contraseña es obligatoria
    if (!editingId && formData.rol === "ADMIN" && !formData.password) {
      toast.error("La contraseña es obligatoria para usuarios ADMIN")
      return
    }

    try {
      const method = editingId ? "PUT" : "POST"
      const endpoint = editingId ? `/api/usuarios/${editingId}` : "/api/usuarios"
      const payload: {
        documento: string
        email: string
        nombre: string
        cargo: string
        rol: string
        sede_codigo: string
        sedes_adicionales: string[]
        password?: string
      } = {
        documento: formData.documento.replace(/[\.\,\s\-]/g, ""),
        email: formData.email,
        nombre: formData.nombre,
        cargo: formData.cargo,
        rol: formData.rol,
        sede_codigo: formData.sede_codigo,
        sedes_adicionales: formData.sedes_adicionales,
      }

      // Solo enviar password si hay algo escrito Y el rol es ADMIN
      if (formData.password && formData.rol === "ADMIN") {
        payload.password = formData.password
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast.success(editingId ? "Usuario actualizado" : "Usuario creado")
        setIsDialogOpen(false)
        fetchUsuarios(page)
      } else {
        const data = await res.json()
        toast.error(data.error || "Error al guardar usuario")
      }
    } catch (error) {
      toast.error("Error de conexión")
    }
  }

  const handleToggleActive = async (usuario: Usuario) => {
    const action = usuario.activo ? "desactivar" : "activar"
    if (!confirm(`¿Estás seguro de que deseas ${action} a ${usuario.nombre}?`)) return

    try {
      const res = await fetch(`/api/usuarios/${usuario.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !usuario.activo }),
      })
      if (res.ok) {
        toast.success(`Usuario ${usuario.activo ? "desactivado" : "activado"}`)
        fetchUsuarios(page)
      } else {
        toast.error(`Error al ${action} usuario`)
      }
    } catch (error) {
      toast.error("Error de conexión")
    }
  }

  const columns: ColumnDef<Usuario>[] = [
    {
      accessorKey: "documento",
      header: ({ column }) => <SortableHeader column={column} title="Documento" />,
    },
    {
      accessorKey: "nombre",
      header: ({ column }) => <SortableHeader column={column} title="Nombre" />,
    },
    {
      accessorKey: "rol",
      header: "Rol",
      cell: ({ row }) => (
        <Badge variant={row.original.rol === "ADMIN" ? "default" : "secondary"}>
          {row.original.rol}
        </Badge>
      ),
    },
    {
      accessorKey: "sede_codigo",
      header: "Sede",
      cell: ({ row }) => {
        const u = row.original
        const nombreDe = (cod: string) =>
          sedes.find((s) => String(s.codigo) === String(cod))?.nombre || cod
        const extra = (u.sedes?.length ?? 1) - 1
        return (
          <div className="flex items-center gap-2">
            <span>{nombreDe(u.sede_codigo)}</span>
            {extra > 0 && (
              <Badge variant="secondary" title={(u.sedes || []).map(nombreDe).join(", ")}>
                +{extra}
              </Badge>
            )}
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
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleToggleActive(row.original)}
              className={cn(
                "flex items-center gap-2",
                row.original.activo ? "text-destructive" : "text-green-600"
              )}
            >
              {row.original.activo ? (
                <><UserX className="h-4 w-4" /> Desactivar</>
              ) : (
                <><UserCheck className="h-4 w-4" /> Activar</>
              )}
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
          <h1 className="text-3xl font-bold text-foreground">Usuarios</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gestiona los usuarios del panel administrativo
          </p>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Usuario
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Actualiza los datos del usuario" : "Crea un nuevo usuario del sistema"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="documento">Documento</Label>
              <Input
                id="documento"
                placeholder="Número de documento"
                value={formData.documento}
                onChange={(e) =>
                  setFormData({ ...formData, documento: e.target.value })
                }
                disabled={!!editingId}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Correo electrónico"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                placeholder="Nombre completo"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                placeholder="Cargo/Posición"
                value={formData.cargo}
                onChange={(e) =>
                  setFormData({ ...formData, cargo: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rol">Rol</Label>
              <Select
                value={formData.rol}
                onValueChange={(val) => setFormData({ ...formData, rol: val, password: val === "AUXILIAR" ? "" : formData.password })}
              >
                <SelectTrigger id="rol">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="AUXILIAR">Auxiliar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sede_codigo">Sede</Label>
              <Select
                value={formData.sede_codigo}
                onValueChange={(val) =>
                  setFormData((prev) => {
                    const nueva = String(val)
                    const anterior = String(prev.sede_codigo)
                    let adicionales = prev.sedes_adicionales.filter((c) => c !== nueva)
                    // Regla (i): al EDITAR, si cambia la sede principal, la anterior se
                    // conserva como adicional (nunca se pierde acceso en silencio; se
                    // puede destildar abajo). Se antepone para respetar [A, X, ...].
                    if (editingId && anterior && anterior !== nueva && !adicionales.includes(anterior)) {
                      adicionales = [anterior, ...adicionales]
                    }
                    return { ...prev, sede_codigo: nueva, sedes_adicionales: adicionales }
                  })
                }
              >
                <SelectTrigger id="sede_codigo">
                  <SelectValue placeholder="Selecciona una sede" />
                </SelectTrigger>
                <SelectContent>
                  {sedes.map((sede) => (
                    <SelectItem key={String(sede.codigo)} value={String(sede.codigo)}>
                      {sede.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Sedes adicionales{" "}
                <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Otras tiendas que atiende, además de la principal. Al iniciar cada jornada,
                el auxiliar elige en cuál trabaja ese día.
              </p>
              {formData.sede_codigo ? (
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                  {sedes
                    .filter((s) => String(s.codigo) !== String(formData.sede_codigo))
                    .map((sede) => {
                      const cod = String(sede.codigo)
                      return (
                        <label
                          key={cod}
                          className="flex cursor-pointer items-center gap-2 py-1 text-sm"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[#1c5a2a]"
                            checked={formData.sedes_adicionales.includes(cod)}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                sedes_adicionales: e.target.checked
                                  ? [...prev.sedes_adicionales, cod]
                                  : prev.sedes_adicionales.filter((c) => c !== cod),
                              }))
                            }
                          />
                          <span>{sede.nombre}</span>
                        </label>
                      )
                    })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Selecciona primero la sede principal.
                </p>
              )}
            </div>

            {formData.rol === "ADMIN" && (
              <div className="space-y-2">
                <Label htmlFor="password">
                  {editingId ? "Cambiar Contraseña (Opcional)" : "Contraseña"}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={editingId ? "Dejar vacío para no cambiar" : "Contraseña del admin"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Solo los usuarios ADMIN necesitan contraseña individual para acceder a este panel.
                </p>
              </div>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit">{editingId ? "Actualizar" : "Crear"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DataTable
        columns={columns}
        data={usuarios}
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setPage}
        isLoading={loading}
        toolbar={
          <Input
            placeholder="Buscar por cédula o nombre..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="max-w-sm"
          />
        }
      />
    </div>
  )
}
