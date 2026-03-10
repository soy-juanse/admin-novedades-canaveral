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

    // ONLY allow updating destinatarios and activo fields
    // Reject any other field changes
    const allowedFields = ["destinatarios", "activo"]
    const requestedFields = Object.keys(body)

    const invalidFields = requestedFields.filter(
      (field) => !allowedFields.includes(field)
    )

    if (invalidFields.length > 0) {
      return NextResponse.json(
        {
          error: `Solo se pueden actualizar los campos: ${allowedFields.join(", ")}. Campos inválidos: ${invalidFields.join(", ")}`,
        },
        { status: 400 }
      )
    }

    // Prepare update object with only allowed fields
    const updateData: any = {}

    if (body.destinatarios !== undefined) {
      updateData.destinatarios = body.destinatarios
    }
    if (body.activo !== undefined) {
      updateData.activo = body.activo
    }

    // Make sure we have at least one field to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          error: "Debes proporcionar al menos un campo válido para actualizar",
        },
        { status: 400 }
      )
    }

    const { data: updatedConfig, error } = await supabase
      .from("config_novedades")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Configuración no encontrada" },
          { status: 404 }
        )
      }
      console.error("Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Log activity
    await supabase.from("log_actividad").insert({
      usuario_id: session.sub,
      accion: "UPDATE_CONFIG_NOVEDAD",
      detalle: `Configuración de novedad actualizada: ${updatedConfig.origen}/${updatedConfig.categoria} (${id})`,
    })

    return NextResponse.json({ data: updatedConfig })
  } catch (err) {
    console.error("PUT /api/config-novedades/[id] error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
