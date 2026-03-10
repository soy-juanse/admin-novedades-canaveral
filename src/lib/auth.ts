import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "admin-panel-secret-change-in-production"
)

const COOKIE_NAME = "admin_session"

export interface JWTPayload {
  sub: string // usuario.id
  documento: string
  nombre: string
  rol: "ADMIN"
  sede_codigo: number
  iat: number
  exp: number
}

export async function createToken(user: {
  id: string
  documento: string
  nombre: string
  rol: string
  sede_codigo: number
}): Promise<string> {
  return new SignJWT({
    sub: user.id,
    documento: user.documento,
    nombre: user.nombre,
    rol: user.rol,
    sede_codigo: user.sede_codigo,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export function getTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
  return match ? match[1] : null
}
