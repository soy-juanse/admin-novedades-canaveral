import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
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
    const search = searchParams.get("search") || ""

    const offset = (page - 1) * pageSize

    // Build query
    let query = supabase.from("usuarios").select("*", { count: "exact" })

    // Apply search filter if provided (search by nombre or documento)
    if (search) {
      query = query.or(`nombre.ilike.%${search}%,documento.ilike.%${search}%`)
    }

    // Apply pagination
    const { data: usuarios, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      data: usuarios,
      count,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (err) {
    console.error("GET /api/usuarios error:", err)
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

    const { documento, email, nombre, cargo, rol, sede_codigo, password, activo, sedes_adicionales } =
      await request.json()

    // Validate required fields (password solo obligatoria para ADMIN)
    if (!documento || !email || !nombre || !cargo || !rol || !sede_codigo) {
      return NextResponse.json(
        { error: "documento, email, nombre, cargo, rol y sede_codigo son requeridos" },
        { status: 400 }
      )
    }

    if (rol === "ADMIN" && !password) {
      return NextResponse.json(
        { error: "La contraseña es obligatoria para usuarios ADMIN" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from("usuarios")
      .select("id")
      .eq("documento", documento)
      .maybeSingle()

    if (checkError) {
      console.error("Check error:", checkError)
      return NextResponse.json({ error: checkError.message }, { status: 400 })
    }

    if (existingUser) {
      return NextResponse.json(
        { error: "El usuario con este documento ya existe" },
        { status: 409 }
      )
    }

    // Multi-sede — INVARIANTE (Obs 1 Fase 1): sede_codigo (principal) NOT NULL y
    // `sedes` SIEMPRE contiene la principal en [0]. El servidor CONSTRUYE el array
    // e IGNORA cualquier `sedes` que venga en el body (un request directo no puede
    // inyectar un array sin la principal). T5 versión admin.
    const principal = String(sede_codigo)
    const adicionales = Array.isArray(sedes_adicionales)
      ? [...new Set(sedes_adicionales.map((c: unknown) => String(c)))].filter((c) => c !== principal)
      : []
    const sedesArray = [principal, ...adicionales]

    // `sedes text[]` no tiene FK por elemento: validar que TODA sede exista.
    const { data: sedesRows, error: sedesErr } = await supabase
      .from("sedes")
      .select("codigo")
      .in("codigo", sedesArray)
    if (sedesErr) {
      console.error("Sedes check error:", sedesErr)
      return NextResponse.json({ error: sedesErr.message }, { status: 400 })
    }
    const sedesExistentes = new Set((sedesRows || []).map((s) => String(s.codigo)))
    const faltantes = sedesArray.filter((c) => !sedesExistentes.has(c))
    if (faltantes.length > 0) {
      return NextResponse.json(
        { error: `Estas sedes no existen: ${faltantes.join(", ")}` },
        { status: 400 }
      )
    }

    // Hash password solo si se proporcionó (ADMIN)
    const insertData: Record<string, unknown> = {
      documento,
      email,
      nombre,
      cargo,
      rol,
      sede_codigo: principal,
      sedes: sedesArray,
      activo: activo !== false,
    }

    if (password) {
      insertData.password_hash = await bcrypt.hash(password, 10)
    }

    // Create user
    const { data: newUser, error: createError } = await supabase
      .from("usuarios")
      .insert(insertData)
      .select()
      .single()

    if (createError) {
      console.error("Create error:", createError)
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // Log activity — nunca debe tumbar la operación (D-b).
    try {
      await supabase.from("log_actividad").insert({
        usuario_id: session.sub,
        accion: "CREATE_USUARIO",
        detalle: `Usuario creado: ${nombre} (${documento}) — sedes: [${sedesArray.join(", ")}]`,
      })
    } catch (logErr) {
      console.error("log_actividad insert failed (CREATE_USUARIO):", logErr)
    }

    return NextResponse.json(
      {
        data: {
          id: newUser.id,
          documento: newUser.documento,
          email: newUser.email,
          nombre: newUser.nombre,
          cargo: newUser.cargo,
          rol: newUser.rol,
          sede_codigo: newUser.sede_codigo,
          activo: newUser.activo,
          created_at: newUser.created_at,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error("POST /api/usuarios error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
