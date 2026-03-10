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
    const { documento, email, nombre, cargo, rol, sede_codigo, password, activo } = body

    // Prepare update object
    const updateData: any = {}

    if (documento !== undefined) updateData.documento = documento
    if (email !== undefined) updateData.email = email
    if (nombre !== undefined) updateData.nombre = nombre
    if (cargo !== undefined) updateData.cargo = cargo
    if (rol !== undefined) updateData.rol = rol
    if (sede_codigo !== undefined) updateData.sede_codigo = sede_codigo
    if (activo !== undefined) updateData.activo = activo

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

    // Log activity
    await supabase.from("log_actividad").insert({
      usuario_id: session.sub,
      accion: "UPDATE_USUARIO",
      detalle: `Usuario actualizado: ${updatedUser.nombre} (${id})`,
    })

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
