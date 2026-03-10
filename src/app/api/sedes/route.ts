import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    // Verify session
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServerClient()

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1", 10)
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10)

    const offset = (page - 1) * pageSize

    // Build query
    const { data: sedes, count, error } = await supabase
      .from("sedes")
      .select("*", { count: "exact" })
      .order("nombre", { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      data: sedes,
      count,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (err) {
    console.error("GET /api/sedes error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify session
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServerClient()

    const { nombre, codigo, tipo } = await request.json()

    // Validate required fields
    if (!nombre || !codigo || !tipo) {
      return NextResponse.json(
        { error: "nombre, codigo, y tipo son requeridos" },
        { status: 400 }
      )
    }

    // Check if codigo already exists
    const { data: existingCode, error: checkError } = await supabase
      .from("sedes")
      .select("codigo")
      .eq("codigo", codigo)
      .maybeSingle()

    if (checkError) {
      console.error("Check error:", checkError)
      return NextResponse.json({ error: checkError.message }, { status: 400 })
    }

    if (existingCode) {
      return NextResponse.json(
        { error: "Ya existe una sede con este código" },
        { status: 409 }
      )
    }

    // Create sede
    const { data: newSede, error } = await supabase
      .from("sedes")
      .insert({
        nombre,
        codigo,
        tipo,
      })
      .select()
      .single()

    if (error) {
      console.error("Create error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Log activity
    await supabase.from("log_actividad").insert({
      usuario_id: session.sub,
      accion: "CREATE_SEDE",
      detalle: `Sede creada: ${nombre} (${codigo})`,
    })

    return NextResponse.json({ data: newSede }, { status: 201 })
  } catch (err) {
    console.error("POST /api/sedes error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
