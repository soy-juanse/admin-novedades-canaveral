import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { getSession } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServerClient()
    const { id } = await params

    const { data: novedad, error } = await supabase
      .from("novedades")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Novedad no encontrada" },
          { status: 404 }
        )
      }
      console.error("Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: novedad })
  } catch (err) {
    console.error("GET /api/novedades/[id] error:", err)
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
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServerClient()
    const { id } = await params

    const body = await request.json()
    const {
      estado,
      comentario,
      prioridad,
      asignado_a,
      resolucion_comentario,
    } = body

    // Only allow updating admin-relevant fields
    const updateData: Record<string, unknown> = {}

    if (estado !== undefined) updateData.estado = estado
    if (comentario !== undefined) updateData.comentario = comentario
    if (prioridad !== undefined) updateData.prioridad = prioridad
    if (asignado_a !== undefined) updateData.asignado_a = asignado_a
    if (resolucion_comentario !== undefined) updateData.resolucion_comentario = resolucion_comentario

    // If marking as resolved, set fecha_resolucion
    if (estado === "RESUELTO" || estado === "CERRADO") {
      updateData.fecha_resolucion = new Date().toISOString()
    }

    const { data: updatedNovedad, error } = await supabase
      .from("novedades")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Novedad no encontrada" },
          { status: 404 }
        )
      }
      console.error("Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: updatedNovedad })
  } catch (err) {
    console.error("PUT /api/novedades/[id] error:", err)
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

    const supabase = createServerClient()
    const { id } = await params

    const { data: deletedNovedad, error } = await supabase
      .from("novedades")
      .delete()
      .eq("id", id)
      .select()
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Novedad no encontrada" },
          { status: 404 }
        )
      }
      console.error("Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: deletedNovedad })
  } catch (err) {
    console.error("DELETE /api/novedades/[id] error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
