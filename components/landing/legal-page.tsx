import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";

interface LegalSection {
  title: string;
  body: readonly string[];
}

interface LegalPageProps {
  eyebrow: string;
  title: string;
  summary: string;
  effectiveDate: string;
  sections: readonly LegalSection[];
}

export function LegalPage({
  eyebrow,
  title,
  summary,
  effectiveDate,
  sections,
}: LegalPageProps) {
  return (
    <main className="min-h-screen bg-[#181c22] text-brand-text">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-10 md:px-10 md:py-14">
        <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-6">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo size={28} />
            <span className="text-sm font-black uppercase tracking-tight text-brand-text">
              Genetrify
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-brand-text/55 transition-colors hover:text-brand-text"
          >
            Back to home
          </Link>
        </div>

        <header className="space-y-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-text/40">
            {eyebrow}
          </p>
          <div className="space-y-3">
            <h1 className="text-4xl font-black uppercase tracking-tight text-brand-text md:text-5xl">
              {title}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-brand-text/65 md:text-base">
              {summary}
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4 text-sm text-brand-text/60">
            <p>
              <span className="font-semibold text-brand-text">
                Business name:
              </span>{" "}
              Genetrify Information Technology Services
            </p>
            <p>
              <span className="font-semibold text-brand-text">
                Website:
              </span>{" "}
              genetrify.com
            </p>
            <p>
              <span className="font-semibold text-brand-text">
                Effective date:
              </span>{" "}
              {effectiveDate}
            </p>
          </div>
        </header>

        <div className="space-y-8">
          {sections.map((section) => (
            <section
              key={section.title}
              className="space-y-3 rounded-3xl border border-white/8 bg-white/[0.02] p-6 md:p-8"
            >
              <h2 className="text-xl font-bold text-brand-text">
                {section.title}
              </h2>
              <div className="space-y-3">
                {section.body.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-sm leading-7 text-brand-text/65 md:text-[15px]"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="border-t border-white/8 pt-6 text-sm leading-7 text-brand-text/45">
          <p>
            Questions about these policies can be sent through the support
            options inside Genetrify or by email at{" "}
            <a
              href="mailto:support@genetrify.com"
              className="text-brand-text/75 transition-colors hover:text-brand-text"
            >
              support@genetrify.com
            </a>
            .
          </p>
        </footer>
      </div>
    </main>
  );
}
