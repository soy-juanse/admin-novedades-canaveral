import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  return NextResponse.json({
    user: {
      id: session.sub,
      documento: session.documento,
      nombre: session.nombre,
      rol: session.rol,
      sede_codigo: session.sede_codigo,
    },
  })
}
