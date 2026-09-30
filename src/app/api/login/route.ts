import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // Read USERNAME and PASSWORD from .env / .env.local
    const expectedUsername = process.env.ADMIN_USERNAME || (process.env.USERNAME?.includes('@') ? process.env.USERNAME : null) || 'eswar@stringartmadeeasy.com';
    const expectedPassword = process.env.PASSWORD || '';

    const inputUser = username?.trim().toLowerCase() || '';

    if (inputUser === expectedUsername.toLowerCase() && password === expectedPassword) {
      return NextResponse.json({
        success: true,
        user: {
          username: expectedUsername,
          role: 'admin',
          name: 'Eswar (Admin)',
        },
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid username or password.' },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: 'Authentication server error.' },
      { status: 500 }
    );
  }
}
