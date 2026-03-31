export default async function CheckEmailPage(props: PageProps<'/check-email'>) {
  const { email } = await props.searchParams
  const displayEmail = typeof email === 'string' ? email : ''

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-brand-text uppercase leading-[0.85]" style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", letterSpacing: '-0.01em' }}>Check Your Email</h2>
        <p className="text-brand-text/40 mt-2 text-sm">
          Confirm your email to finish creating your account.
        </p>
      </div>

      <div className="rounded-2xl border border-brand-accent/20 bg-brand-accent/8 px-5 py-4">
        <p className="text-sm text-brand-text/80">
          We sent a confirmation link to{' '}
          <span className="font-semibold text-brand-text">{displayEmail || 'your email address'}</span>.
        </p>
        <p className="mt-3 text-sm text-brand-text/55">
          Open the email and click the confirmation link. Once confirmed, we&apos;ll sign you in and finish the setup.
        </p>
      </div>
    </div>
  )
}
