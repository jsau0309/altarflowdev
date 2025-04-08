import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // During UI development, we'll allow access to all pages
  // This middleware is a placeholder for future authentication logic

  // Simply pass through all requests without restrictions
  return NextResponse.next()
}

// Keep the matcher configuration for future use
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
