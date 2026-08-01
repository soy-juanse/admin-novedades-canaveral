import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { createServerClient } from "@/lib/supabase"
import { getSession } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify session
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServerClient()
    const { id } = await params

    const { data: usuario, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Usuario no encontrado" },
          { status: 404 }
        )
      }
      console.error("Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: usuario })
  } catch (err) {
    console.error("GET /api/usuarios/[id] error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify session
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServerClient()
    const { id } = await params

    const body = await request.json()
    const { documento, email, nombre, cargo, rol, sede_codigo, password, activo, sedes_adicionales } = body

    // Prepare update object
    const updateData: any = {}

    if (documento !== undefined) updateData.documento = documento
    if (email !== undefined) updateData.email = email
    if (nombre !== undefined) updateData.nombre = nombre
    if (cargo !== undefined) updateData.cargo = cargo
    if (rol !== undefined) updateData.rol = rol
    if (activo !== undefined) updateData.activo = activo

    // Sede: solo si el body la trae (el toggle de activo NO la manda, así que
    // NO se toca sede/sedes en ese caso). INVARIANTE / T5: un usuario NUNCA puede
    // quedar sin sede principal. Se reconstruye `sedes` server-side, ignorando
    // cualquier `sedes` del body.
    if (sede_codigo !== undefined) {
      const principal = sede_codigo === null ? "" : String(sede_codigo).trim()
      if (!principal) {
        return NextResponse.json(
          { error: "La sede principal es obligatoria: un usuario no puede quedar sin sede." },
          { status: 400 }
        )
      }
      const adicionales = Array.isArray(sedes_adicionales)
        ? [...new Set(sedes_adicionales.map((c: unknown) => String(c)))].filter((c) => c !== principal)
        : []
      const sedesArray = [principal, ...adicionales]

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

      updateData.sede_codigo = principal
      updateData.sedes = sedesArray
    }

    // Hash password if provided
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10)
    }

    const { data: updatedUser, error } = await supabase
      .from("usuarios")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Usuario no encontrado" },
          { status: 404 }
        )
      }
      console.error("Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Log activity — nunca debe tumbar la operación (D-b).
    try {
      await supabase.from("log_actividad").insert({
        usuario_id: session.sub,
        accion: "UPDATE_USUARIO",
        detalle: updateData.sedes
          ? `Usuario actualizado: ${updatedUser.nombre} (${id}) — sedes: [${updateData.sedes.join(", ")}]`
          : `Usuario actualizado: ${updatedUser.nombre} (${id})`,
      })
    } catch (logErr) {
      console.error("log_actividad insert failed (UPDATE_USUARIO):", logErr)
    }

    return NextResponse.json({ data: updatedUser })
  } catch (err) {
    console.error("PUT /api/usuarios/[id] error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify session
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServerClient()
    const { id } = await params

    // Prevent deleting yourself
    if (id === session.sub) {
      return NextResponse.json(
        { error: "No puedes eliminar tu propio usuario" },
        { status: 400 }
      )
    }

    // Get user info before deleting (for log)
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("nombre")
      .eq("id", id)
      .single()

    // Hard delete
    const { error } = await supabase
      .from("usuarios")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: { id, deleted: true } })
  } catch (err) {
    console.error("DELETE /api/usuarios/[id] error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
