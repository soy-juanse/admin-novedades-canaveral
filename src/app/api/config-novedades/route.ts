import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServerClient()
    const searchParams = request.nextUrl.searchParams
    const mode = searchParams.get("mode")

    // Modo árbol: retorna todas las configs + grupos para el componente "Configurar Grupo"
    if (mode === "tree") {
      const [configResult, gruposResult] = await Promise.all([
        supabase
          .from("config_novedades")
          .select("id, origen, categoria, novedad_tipo, destinatarios, activo")
          .order("origen")
          .order("categoria")
          .order("novedad_tipo"),
        supabase
          .from("destinatarios_email")
          .select("rol_codigo, rol_nombre")
          .eq("activo", true)
          .order("rol_nombre"),
      ])

      if (configResult.error) {
        return NextResponse.json({ error: configResult.error.message }, { status: 400 })
      }

      return NextResponse.json({
        configs: configResult.data,
        grupos: gruposResult.data || [],
      })
    }

    // Modo paginado (default): para la tabla
    const page = parseInt(searchParams.get("page") || "1", 10)
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10)
    const offset = (page - 1) * pageSize

    const { data: configs, count, error } = await supabase
      .from("config_novedades")
      .select("*", { count: "exact" })
      .order("origen", { ascending: true })
      .order("categoria", { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      data: configs,
      count,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (err) {
    console.error("GET /api/config-novedades error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServerClient()
    const { rol_codigo, config_ids } = await request.json()

    if (!rol_codigo || !Array.isArray(config_ids)) {
      return NextResponse.json(
        { error: "rol_codigo y config_ids son requeridos" },
        { status: 400 }
      )
    }

    // Obtener todas las configs
    const { data: allConfigs, error: fetchError } = await supabase
      .from("config_novedades")
      .select("id, destinatarios")

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 })
    }

    // Para cada config: si está en config_ids, agregar el grupo; si no, quitarlo
    const updates = allConfigs
      .map((config) => {
        const currentDest: string[] = config.destinatarios || []
        const shouldHave = config_ids.includes(config.id)
        const hasIt = currentDest.includes(rol_codigo)

        if (shouldHave && !hasIt) {
          return {
            id: config.id,
            destinatarios: [...currentDest, rol_codigo].sort(),
          }
        } else if (!shouldHave && hasIt) {
          return {
            id: config.id,
            destinatarios: currentDest.filter((d) => d !== rol_codigo),
          }
        }
        return null // No change needed
      })
      .filter(Boolean)

    // Ejecutar updates
    let updatedCount = 0
    for (const update of updates) {
      if (!update) continue
      const { error } = await supabase
        .from("config_novedades")
        .update({ destinatarios: update.destinatarios })
        .eq("id", update.id)

      if (error) {
        console.error(`Error updating config ${update.id}:`, error)
      } else {
        updatedCount++
      }
    }

    await supabase.from("log_actividad").insert({
      usuario_id: session.sub,
      accion: "ASSIGN_GROUP_CONFIG",
      detalle: `Grupo ${rol_codigo} asignado/desasignado en ${updatedCount} tipos de novedad`,
    })

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `${updatedCount} configuraciones actualizadas`,
    })
  } catch (err) {
    console.error("POST /api/config-novedades error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
