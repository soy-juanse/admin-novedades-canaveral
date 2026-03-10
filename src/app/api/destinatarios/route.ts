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
    const page = parseInt(searchParams.get("page") || "1", 10)
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10)

    const offset = (page - 1) * pageSize

    const { data, count, error } = await supabase
      .from("destinatarios_email")
      .select("*", { count: "exact" })
      .order("rol_nombre", { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      data,
      count,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (err) {
    console.error("GET /api/destinatarios error:", err)
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
    const { rol_nombre, emails } = await request.json()

    if (!rol_nombre || !emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: "Nombre del grupo y al menos un email son requeridos" },
        { status: 400 }
      )
    }

    // Autogenerar rol_codigo desde rol_nombre
    const rol_codigo = rol_nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // quitar tildes
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, "") // solo letras, números y espacios
      .trim()
      .replace(/\s+/g, "_") // espacios a guión bajo

    if (!rol_codigo) {
      return NextResponse.json(
        { error: "No se pudo generar un código válido desde el nombre" },
        { status: 400 }
      )
    }

    // Verificar que no exista
    const { data: existing } = await supabase
      .from("destinatarios_email")
      .select("rol_codigo")
      .eq("rol_codigo", rol_codigo)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: `Ya existe un grupo con código "${rol_codigo}". Usa un nombre diferente.` },
        { status: 409 }
      )
    }

    // Limpiar emails (trim, lowercase, quitar vacíos)
    const cleanEmails = emails
      .map((e: string) => e.trim().toLowerCase())
      .filter((e: string) => e.length > 0)

    const { data, error } = await supabase
      .from("destinatarios_email")
      .insert({
        rol_codigo,
        rol_nombre: rol_nombre.trim(),
        emails: cleanEmails,
        activo: true,
      })
      .select()
      .single()

    if (error) {
      console.error("Create error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await supabase.from("log_actividad").insert({
      usuario_id: session.sub,
      accion: "CREATE_DESTINATARIO",
      detalle: `Grupo creado: ${rol_nombre} (${rol_codigo}) con ${cleanEmails.length} email(s)`,
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error("POST /api/destinatarios error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
