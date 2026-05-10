# CLAUDE.md — Admin Panel PWA Novedades Logísticas

> Contexto completo para que cualquier instancia de IA retome este proyecto sin fricciones.

## Qué es este proyecto

Panel administrativo web para gestionar el sistema de **Novedades Logísticas** de **Supertiendas Cañaveral**. Los auxiliares de bodega reportan novedades (problemas con mercancía) desde una PWA móvil; este admin permite a los administradores gestionar usuarios, configurar qué novedades se reportan, definir destinatarios de emails, y administrar sedes.

**URL producción:** https://sync-admin-novedades.jpssny.easypanel.host
**Operadora principal:** Julieth (tiene manual de uso en `/Manual-Admin-Novedades.docx`)

---

## Stack técnico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.6 |
| Runtime | React | 19.2.3 |
| Lenguaje | TypeScript | 5.x |
| Estilos | Tailwind CSS | 4.x |
| Componentes UI | shadcn/ui (Radix primitives) | custom |
| Tablas | TanStack React Table | 8.x |
| Auth | JWT custom (jose) + bcryptjs | - |
| Backend | Supabase (PostgreSQL + REST) | supabase-js 2.99 |
| Deploy | Docker (standalone) → Easypanel | node:20-alpine |
| Repo | github.com/soy-juanse/admin-novedades | público |

---

## Estructura de archivos

```
admin/
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx          # Login con cédula + contraseña
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                  # Sidebar + Header + main
│   │   │   ├── usuarios/page.tsx           # CRUD usuarios
│   │   │   ├── novedades/page.tsx          # Vista + detalle novedades
│   │   │   ├── destinatarios/page.tsx      # Grupos de email
│   │   │   ├── config-novedades/page.tsx   # Checkbox tree + tabla config
│   │   │   └── sedes/page.tsx              # CRUD sedes
│   │   ├── api/
│   │   │   ├── auth/login/route.ts         # POST login → JWT cookie
│   │   │   ├── auth/logout/route.ts        # POST logout → clear cookie
│   │   │   ├── auth/me/route.ts            # GET sesión actual
│   │   │   ├── usuarios/route.ts           # GET (paginado) + POST
│   │   │   ├── usuarios/[id]/route.ts      # PUT + DELETE
│   │   │   ├── novedades/route.ts          # GET (paginado)
│   │   │   ├── novedades/[id]/route.ts     # GET detalle
│   │   │   ├── destinatarios/route.ts      # GET grupos + POST save
│   │   │   ├── destinatarios/[id]/route.ts # PUT + DELETE grupo
│   │   │   ├── config-novedades/route.ts   # GET (paginado|tree) + POST assign
│   │   │   ├── config-novedades/[id]/route.ts # PUT toggle activo
│   │   │   ├── sedes/route.ts              # GET + POST
│   │   │   └── sedes/[id]/route.ts         # PUT + DELETE
│   │   ├── layout.tsx                      # Root layout
│   │   └── page.tsx                        # Redirect → /login
│   ├── components/
│   │   ├── layout/sidebar.tsx              # Navegación lateral
│   │   ├── layout/header.tsx               # Barra superior + logout
│   │   └── ui/                             # shadcn components
│   ├── lib/
│   │   ├── supabase.ts                     # ⚠️ Lazy Proxy init (crítico)
│   │   ├── auth.ts                         # JWT create/verify/getSession
│   │   └── utils.ts                        # cn() helper
│   ├── middleware.ts                        # Auth guard (JWT verify en edge)
│   └── types/database.ts                   # Interfaces TypeScript
├── Dockerfile                              # Multi-stage build
├── .dockerignore
├── next.config.ts                          # output: "standalone"
├── .env.local                              # ⚠️ NO está en git
└── package.json
```

---

## Patrones arquitectónicos

### Autenticación
- Login con **cédula** (documento) + contraseña hasheada (bcrypt).
- Solo usuarios con `rol: "ADMIN"` pueden entrar.
- JWT firmado con HS256, expiración 8h, guardado en cookie httpOnly `admin_session`.
- Middleware en edge verifica JWT en cada request no-público.
- Rutas públicas: `/login`, `/api/auth/login`.

### Supabase — PATRÓN CRÍTICO
El archivo `src/lib/supabase.ts` usa **lazy initialization con JavaScript Proxy** para evitar que `createClient()` se ejecute en build time (cuando no hay env vars). Si modificas este archivo o creas nuevos clientes Supabase, **nunca evalúes `process.env` a nivel de módulo**. Siempre dentro de funciones.

```typescript
// ✅ CORRECTO — lazy
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// ❌ INCORRECTO — rompe el build Docker
export const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, ...)
```

Hay **dos clientes**:
- `supabase` (Proxy) — usa anon key, respeta RLS. Para el lado cliente.
- `createServerClient()` — usa service_role_key, bypasses RLS. Solo para API routes.

### API Routes
Todas las API routes siguen este patrón:
1. Verificar sesión con `getSession()` (retorna null si no hay JWT válido)
2. Obtener Supabase server client con `createServerClient()`
3. Ejecutar query
4. Log de actividad en `log_actividad` para operaciones de escritura
5. Respuesta JSON con `{ data, count, page, pageSize, totalPages }` para listados

### Frontend Pages
Todas las páginas del dashboard son `"use client"` y siguen:
1. Estado local con useState para datos, loading, paginación
2. Fetch a API routes propias (nunca directo a Supabase desde cliente)
3. DataTable reutilizable con paginación server-side
4. Dialogs para crear/editar
5. Toast (sonner) para feedback
6. Iconos de lucide-react

### Componente especial: ConfigurarGrupo
El checkbox tree en `config-novedades/page.tsx` es el componente más complejo. Permite asignar tipos de novedad a grupos de destinatarios con checkboxes jerárquicos (Origen → Categoría → Tipo). Soporta selección parcial (indeterminate), collapse/expand, y guarda la asignación en batch via POST.

---

## Tablas Supabase

| Tabla | Descripción | PK |
|---|---|---|
| `usuarios` | Usuarios del sistema (admin y auxiliares) | `id` (uuid) |
| `sedes` | Puntos de venta / bodegas | `codigo` (int) |
| `novedades` | Reportes de novedades logísticas | `id` (uuid) |
| `config_novedades` | Catálogo de tipos de novedad configurables | `id` (serial) |
| `destinatarios_email` | Grupos de destinatarios con sus emails | `rol_codigo` (text) |
| `log_actividad` | Registro de acciones del admin | `id` (serial) |
| `productos` | Catálogo de productos (sync diario desde ERP) | `ean` |

### Campos clave de config_novedades
- `origen`: FACTURA | TRASLADO | INVENTARIO
- `categoria`: CANTIDAD | CALIDAD | IDENTIFICACION | GESTION
- `novedad_tipo`: texto libre (ej: "Producto dañado")
- `destinatarios`: text[] (array de rol_codigo)
- `activo`: boolean

### Campos clave de usuarios
- `documento`: cédula (unique, usado como login)
- `rol`: ADMIN | AUXILIAR
- `sede_codigo`: FK a sedes.codigo
- `password_hash`: solo para ADMIN (bcrypt)
- `activo`: boolean (soft-delete)

---

## Variables de entorno

```env
# Build-time (se incrustan en el bundle JS del cliente)
NEXT_PUBLIC_SUPABASE_URL=https://qgwdgnijbrakohzdvgpx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Runtime-only (solo API routes, nunca expuestos al cliente)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=<string-seguro>
NODE_ENV=production
```

En Easypanel estas variables se configuran como Environment Variables del servicio. Las `NEXT_PUBLIC_*` también deben ir como Build Args en el Dockerfile.

---

## Deploy

### Pipeline actual
1. Push a `main` en GitHub (soy-juanse/admin-novedades)
2. Easypanel detecta el push (o rebuild manual)
3. Docker multi-stage build: deps → build → runner
4. Imagen final: ~120MB, node:20-alpine, usuario no-root `nextjs`
5. Puerto 3000 expuesto

### Comandos útiles
```bash
# Dev local
cd admin && npm run dev

# Build local (requiere env vars)
NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npm run build

# Push a producción
git add -A && git commit -m "descripción" && git push origin main
# Luego rebuild en Easypanel
```

### GitHub auth (cuenta soy-juanse)
```bash
gh auth login -h github.com -p https -w
gh auth setup-git  # Configura git para usar credenciales de gh
```

---

## Decisiones arquitectónicas

Ver `DECISIONS.md` en la raíz de `/PWA/` para el historial completo de decisiones con fecha, razonamiento y alternativas descartadas.

**Decisiones más impactantes:**
- Auth custom con cédula (no Supabase Auth) — auxiliares comparten dispositivos
- Supabase lazy Proxy — build Docker fallaba sin esto
- shadcn/ui con tema Cañaveral (#1C5A2A) — verde corporativo
- Tailwind v4 (no v3) — funciona con Next.js 16
- output: "standalone" — requerido para Docker con Next.js

---

## Deuda técnica conocida

1. **Orphaned rol_codigos**: Cuando se elimina un grupo de destinatarios, sus `rol_codigo` quedan en el array `destinatarios` de `config_novedades`. Falta un trigger o cascade que limpie.
2. **Auto-deploy**: No hay webhook de GitHub → Easypanel. El rebuild es manual.
3. **Dominio custom**: La app corre en subdominio de Easypanel. Se puede configurar dominio propio.
4. **Tests**: No hay tests automatizados. Todo se probó manualmente.
5. **Dashboard**: El enlace a Looker Studio en el sidebar es placeholder.

---

## Convenciones de código

- Nombres de archivos: kebab-case (`config-novedades`, `data-table`)
- Componentes React: PascalCase (`ConfigurarGrupo`, `DataTable`)
- API responses: `{ data, error, count }` wrapper
- Paginación: query params `page` + `pageSize`, respuesta incluye `totalPages`
- Colores brand: `#1C5A2A` (verde Cañaveral), `accent-[#1c5a2a]` en checkboxes
- Feedback: `toast.success()` / `toast.error()` de sonner
- Todas las operaciones de escritura logean en `log_actividad`

---

## Contexto del ecosistema

Este admin es **una pieza** de un sistema más grande:

1. **PWA Móvil** (Vue.js + Capacitor): La usan los auxiliares en bodega para reportar novedades. Usa Supabase directo con anon key + RLS.
2. **Sync diario** (Node.js cron en Easypanel): Actualiza la tabla `productos` desde el ERP de Cañaveral.
3. **Este Admin** (Next.js): Gestión de usuarios, config, destinatarios.
4. **Supabase**: Base de datos compartida por los 3 sistemas.

No tocar la tabla `productos` desde este admin — se sincroniza externamente.

---

## Cómo agregar un módulo nuevo

1. Crear página en `src/app/(dashboard)/nuevo-modulo/page.tsx` (copiar patrón de `usuarios/page.tsx`)
2. Crear API routes en `src/app/api/nuevo-modulo/route.ts` y `[id]/route.ts`
3. Agregar enlace en `src/components/layout/sidebar.tsx`
4. Agregar tipos en `src/types/database.ts`
5. Probar en local, push, rebuild en Easypanel
6. Actualizar `DECISIONS.md` con la decisión
