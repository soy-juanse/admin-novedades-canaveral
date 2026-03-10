import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { createServerClient } from "@/lib/supabase"
import { createToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { documento, password } = await request.json()

    if (!documento || !password) {
      return NextResponse.json(
        { error: "Cédula y contraseña son requeridos" },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Find user by documento
    const { data: user, error } = await supabase
      .from("usuarios")
      .select("id, documento, nombre, rol, sede_codigo, activo, password_hash")
      .eq("documento", documento)
      .single()

    if (error || !user) {
      console.error("DB query error:", error)
      console.log("Documento buscado:", documento)
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      )
    }

    console.log("User found:", user.nombre, "| Rol:", user.rol, "| Activo:", user.activo, "| Has hash:", !!user.password_hash)

    // Check active
    if (!user.activo) {
      return NextResponse.json(
        { error: "Usuario desactivado" },
        { status: 403 }
      )
    }

    // Check role
    if (user.rol !== "ADMIN") {
      return NextResponse.json(
        { error: "Acceso restringido a administradores" },
        { status: 403 }
      )
    }

    // Check password
    if (!user.password_hash) {
      return NextResponse.json(
        { error: "Contraseña no configurada. Contacte al administrador." },
        { status: 403 }
      )
    }

    const validPassword = await bcrypt.compare(password, user.password_hash)
    if (!validPassword) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      )
    }

    // Create JWT
    const token = await createToken({
      id: user.id,
      documento: user.documento,
      nombre: user.nombre,
      rol: user.rol,
      sede_codigo: user.sede_codigo,
    })

    // Log activity
    await supabase.from("log_actividad").insert({
      usuario_id: user.id,
      accion: "LOGIN_ADMIN",
      detalle: `Login admin panel: ${user.nombre}`,
    })

    // Set cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        rol: user.rol,
      },
    })

    response.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    })

    return response
  } catch (err) {
    console.error("Login error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
