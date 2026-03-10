"use client"

import { useState, useEffect } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Plus, Pencil, UserX, UserCheck, Trash2, MoreHorizontal, Eye, EyeOff } from "lucide-react"
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

  useEffect(() => {
    fetchUsuarios(page)
  }, [page])

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
        sede_codigo: usuario.sede_codigo,
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
      const payload: Record<string, string> = {
        documento: formData.documento.replace(/[\.\,\s\-]/g, ""),
        email: formData.email,
        nombre: formData.nombre,
        cargo: formData.cargo,
        rol: formData.rol,
        sede_codigo: formData.sede_codigo,
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

  const handleDelete = async (usuario: Usuario) => {
    if (!confirm(`¿Estás seguro de que deseas ELIMINAR permanentemente a ${usuario.nombre}? Esta acción no se puede deshacer.`)) return

    try {
      const res = await fetch(`/api/usuarios/${usuario.id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Usuario eliminado permanentemente")
        fetchUsuarios(page)
      } else {
        const data = await res.json()
        toast.error(data.error || "Error al eliminar usuario")
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
      accessorKey: "sede_nombre",
      header: "Sede",
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
            <DropdownMenuItem
              onClick={() => handleDelete(row.original)}
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
              <Select value={formData.sede_codigo} onValueChange={(val) => setFormData({ ...formData, sede_codigo: val })}>
                <SelectTrigger id="sede_codigo">
                  <SelectValue placeholder="Selecciona una sede" />
                </SelectTrigger>
                <SelectContent>
                  {sedes.map((sede) => (
                    <SelectItem key={sede.codigo} value={sede.codigo}>
                      {sede.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
        searchKey="documento"
        searchPlaceholder="Buscar por documento..."
      />
    </div>
  )
}
