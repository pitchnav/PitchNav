'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState('')
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    setServerError('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      setSubmitted(true)
    } catch (err: unknown) {
      setServerError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 pt-24 pb-16 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="inline-block mb-6">
            <span className="text-3xl font-black text-white">Pitch</span>
            <span className="text-3xl font-black italic text-electric-blue-light">Nav</span>
          </Link>
          <h1 className="text-3xl font-black text-white">Reset Password</h1>
          <p className="mt-2 text-slate-400">
            {submitted
              ? 'Check your email for a reset link.'
              : 'Enter your email and we\'ll send you a reset link.'}
          </p>
        </div>

        {submitted ? (
          <div className="card text-center">
            <div className="text-5xl mb-4">✉️</div>
            <h2 className="text-xl font-bold text-white mb-3">Reset Email Sent</h2>
            <p className="text-sm text-slate-400 mb-6">
              If an account exists for that email, you'll receive a password reset link shortly.
              Check your spam folder if you don't see it.
            </p>
            <Link href="/login" className="btn-secondary w-full justify-center">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <div className="card">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <div>
                <label htmlFor="email" className="label">Email Address</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="input"
                  placeholder="jane@example.com"
                  {...register('email')}
                />
                {errors.email && <p className="error-message">{errors.email.message}</p>}
              </div>

              {serverError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                  {serverError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/login" className="text-electric-blue-light hover:underline">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
