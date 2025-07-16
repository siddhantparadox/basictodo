import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')

  if (token_hash && type) {
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Handle magic link callback
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'email',
    })
    
    if (error) {
      console.error('Error verifying magic link:', error)
      return NextResponse.redirect(`${requestUrl.origin}/auth?error=Invalid magic link`)
    }

    // Redirect to dashboard on successful authentication
    return NextResponse.redirect(`${requestUrl.origin}/`)
  }

  // If no token_hash, redirect to auth page
  return NextResponse.redirect(`${requestUrl.origin}/auth`)
}