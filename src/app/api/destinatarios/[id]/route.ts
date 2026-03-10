import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { getSession } from "@/lib/auth"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const rol_codigo = decodeURIComponent(id)
    const supabase = createServerClient()
    const body = await request.json()

    const updateData: Record<string, unknown> = {}

    if (body.rol_nombre !== undefined) {
      updateData.rol_nombre = body.rol_nombre.trim()
    }

    if (body.emails !== undefined) {
      if (!Array.isArray(body.emails) || body.emails.length === 0) {
        return NextResponse.json(
          { error: "Al menos un email es requerido" },
          { status: 400 }
        )
      }
      updateData.emails = body.emails
        .map((e: string) => e.trim().toLowerCase())
        .filter((e: string) => e.length > 0)
    }

    if (body.activo !== undefined) {
      updateData.activo = body.activo
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No hay campos para actualizar" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("destinatarios_email")
      .update(updateData)
      .eq("rol_codigo", rol_codigo)
      .select()
      .single()

    if (error) {
      console.error("Update error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await supabase.from("log_actividad").insert({
      usuario_id: session.sub,
      accion: "UPDATE_DESTINATARIO",
      detalle: `Grupo actualizado: ${data.rol_nombre} (${rol_codigo})`,
    })

    return NextResponse.json({ data })
  } catch (err) {
    console.error("PUT /api/destinatarios/[id] error:", err)
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
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const rol_codigo = decodeURIComponent(id)
    const supabase = createServerClient()

    // Obtener nombre antes de eliminar (para el log)
    const { data: existing } = await supabase
      .from("destinatarios_email")
      .select("rol_nombre")
      .eq("rol_codigo", rol_codigo)
      .single()

    const { error } = await supabase
      .from("destinatarios_email")
      .delete()
      .eq("rol_codigo", rol_codigo)

    if (error) {
      console.error("Delete error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await supabase.from("log_actividad").insert({
      usuario_id: session.sub,
      accion: "DELETE_DESTINATARIO",
      detalle: `Grupo eliminado: ${existing?.rol_nombre || rol_codigo} (${rol_codigo})`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("DELETE /api/destinatarios/[id] error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
