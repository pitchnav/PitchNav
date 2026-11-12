import { type NextRequest, NextResponse } from 'next/server'
import { authReturnPath } from '@/lib/auth-redirect'
import { createClient } from '@/lib/supabase/server'

// Supabase auth callback handler — exchanges code for session
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = authReturnPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return to error page on failure
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
