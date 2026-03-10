export interface Usuario {
  id: string
  documento: string
  email: string
  nombre: string
  cargo: string
  rol: "ADMIN" | "AUXILIAR"
  sede_codigo: number
  activo: boolean
  created_at: string
  password_hash?: string | null
  // Joined
  sede_nombre?: string
}

export interface Sede {
  codigo: string
  nombre: string
  tipo: string
  created_at: string
}

export interface Novedad {
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

export interface ConfigNovedad {
  id: number
  origen: string
  categoria: string
  tipo_novedad: string
  activo: boolean
  destinatarios: string | null
  created_at: string
}

export interface DestinatarioEmail {
  rol_codigo: string
  rol_nombre: string
  emails: string[]
  activo: boolean
}

export interface LogActividad {
  id: number
  usuario_id: string | null
  accion: string
  detalle: string | null
  created_at: string
}

// API response wrapper
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  count?: number
}

// Pagination
export interface PaginationParams {
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
  search?: string
}
