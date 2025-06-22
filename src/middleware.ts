import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  console.log(`🚨 MIDDLEWARE: ${pathname}`)
  
  // ✅ RUTAS PÚBLICAS - NO tocar
  const publicRoutes = ['/', '/landing', '/login', '/registro', '/auth', '/reset-password']
  
  // Si es una ruta pública, permitir acceso directo
  if (publicRoutes.includes(pathname)) {
    console.log(`✅ RUTA PÚBLICA: ${pathname}`)
    return NextResponse.next()
  }
  
  // ✅ RUTAS PROTEGIDAS - Solo estas requieren auth
  const protectedRoutes = ['/dashboard', '/perfil', '/presupuesto', '/transacciones', '/objetivos', '/inversiones', '/gastos-fijos', '/estadisticas', '/tareas-financieras']
  
  // Solo verificar auth si es una ruta protegida específica
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    console.log(`🛡️ VERIFICANDO AUTH: ${pathname}`)
    
    // Verificar variables de entorno
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.log(`🚫 Variables de entorno faltantes`)
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Crear cliente Supabase
    let response = NextResponse.next()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // Verificar usuario (función async dentro de función sync)
    return (async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
          console.log(`🚫 NO AUTENTICADO: ${pathname} - ${error?.message || 'No user'}`)
          const loginUrl = new URL('/login', request.url)
          loginUrl.searchParams.set('redirectTo', pathname)
          return NextResponse.redirect(loginUrl)
        }
        
        console.log(`✅ AUTENTICADO: ${user.email} -> ${pathname}`)
        return response
      } catch (authError: any) {
        console.error('🚨 ERROR AUTH MIDDLEWARE:', authError?.message || authError)
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirectTo', pathname)
        return NextResponse.redirect(loginUrl)
      }
    })()
  }
  
  // Para todas las demás rutas (APIs, archivos estáticos, etc.), permitir acceso
  console.log(`✅ RUTA NO PROTEGIDA: ${pathname}`)
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
} 