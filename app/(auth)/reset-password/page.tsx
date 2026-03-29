import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-brand-text uppercase leading-[0.85]" style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", letterSpacing: '-0.01em' }}>New Password</h2>
        <p className="text-brand-text/40 mt-2 text-sm">Choose a strong password for your account.</p>
      </div>

      <ResetPasswordForm />
    </div>
  )
}
