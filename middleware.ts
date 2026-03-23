import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  // If ADMIN_PASSWORD is not set, we don't enforce auth (prevents locking out during setup)
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.next();
  }

  const basicAuth = req.headers.get('authorization');

  if (!basicAuth) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Dashboard"'
      }
    });
  }

  try {
    const authValue = basicAuth.split(' ')[1];
    const decodedValue = atob(authValue);
    const [user, ...passParts] = decodedValue.split(':');
    const pass = passParts.join(':');

    const expectedUser = process.env.ADMIN_USERNAME || 'admin';
    const expectedPass = process.env.ADMIN_PASSWORD;

    if (user !== expectedUser || pass !== expectedPass) {
        return new NextResponse('Invalid credentials', {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Basic realm="Secure Dashboard"'
          }
        });
    }
  } catch (err) {
    return new NextResponse('Invalid Basic Auth format', { status: 400 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Protect all UI routes, but ignore API and static files:
     * - api (n8n API routes and frontend fetch routes are handled by Next.js or crm-auth)
     * - _next/static (static assets)
     * - _next/image (image optimization)
     * - favicon.ico (icon)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
