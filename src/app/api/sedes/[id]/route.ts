import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { getSession } from "@/lib/auth"

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
    const { nombre, tipo } = body

    // Prepare update object
    const updateData: any = {}

    if (nombre !== undefined) updateData.nombre = nombre
    if (tipo !== undefined) updateData.tipo = tipo

    const { data: updatedSede, error } = await supabase
      .from("sedes")
      .update(updateData)
      .eq("codigo", id)
      .select()
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Sede no encontrada" },
          { status: 404 }
        )
      }
      console.error("Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Log activity
    await supabase.from("log_actividad").insert({
      usuario_id: session.sub,
      accion: "UPDATE_SEDE",
      detalle: `Sede actualizada: ${updatedSede.nombre} (${id})`,
    })

    return NextResponse.json({ data: updatedSede })
  } catch (err) {
    console.error("PUT /api/sedes/[id] error:", err)
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

    // Hard delete
    const { data: sede, error } = await supabase
      .from("sedes")
      .delete()
      .eq("codigo", id)
      .select()
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Sede no encontrada" },
          { status: 404 }
        )
      }
      console.error("Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Log activity
    await supabase.from("log_actividad").insert({
      usuario_id: session.sub,
      accion: "DELETE_SEDE",
      detalle: `Sede eliminada: ${sede.nombre} (${id})`,
    })

    return NextResponse.json({ data: sede })
  } catch (err) {
    console.error("DELETE /api/sedes/[id] error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
