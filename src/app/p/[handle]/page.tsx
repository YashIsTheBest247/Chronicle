import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight, Calendar, Sparkles } from "lucide-react";
import { getPublicProfile } from "@/lib/profile";
import { Logo } from "@/components/Logo";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getPublicProfile(handle).catch(() => null);
  if (!profile) return { title: "Not found · Chronicle" };

  const name = profile.name ?? `@${profile.handle}`;
  return {
    title: `${name} · Chronicle`,
    description:
      profile.headline ??
      `${profile.totals.records} records, ${profile.totals.skills} skills, connected into one verified journey.`,
    openGraph: {
      title: `${name} · Chronicle`,
      description: profile.headline ?? undefined,
    },
  };
}

/**
 * A read-only view of someone's journey, shareable as a single link.
 *
 * Rendered on the server from `getPublicProfile`, which selects only
 * presentational columns — so there is no client fetch that could be pointed
 * at another account, and no path from this page to a stored file.
 */
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const profile = await getPublicProfile(handle);
  if (!profile) notFound();

  const name = profile.name ?? `@${profile.handle}`;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-5">
          <Logo />
          <Link
            href="/"
            className="ml-auto text-[0.9375rem] text-muted transition-colors hover:text-fg"
          >
            What is Chronicle?
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
        {/* Back to the directory — the discovery path in, and the natural place
            to browse on to another profile. Always /explore, since a visitor
            may have arrived from a shared link with no in-app history. */}
        <Link
          href="/explore"
          className="mb-8 inline-flex items-center gap-1.5 text-[0.9375rem] text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft size={16} />
          Back to directory
        </Link>

        {/* Identity */}
        <div className="flex flex-wrap items-center gap-5">
          {profile.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.image}
              alt=""
              className="size-16 rounded-full object-cover"
            />
          )}
          <div className="min-w-0">
            <h1 className="t-page">{name}</h1>
            {profile.headline && (
              <p className="mt-1.5 text-[1.0625rem] text-muted text-pretty">
                {profile.headline}
              </p>
            )}
          </div>
        </div>

        {/* Totals */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { n: profile.totals.records, label: "records" },
            { n: profile.totals.skills, label: "skills" },
            { n: profile.totals.connections, label: "connections" },
          ].map((s) => (
            <div key={s.label} className="card p-5">
              <p className="font-display text-[1.75rem] leading-none font-semibold tabular-nums">
                {s.n}
              </p>
              <p className="mt-1.5 text-[0.9375rem] text-muted">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Categories */}
        {profile.categories.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {profile.categories.map((c) => (
              <span key={c.name} className="pill text-muted">
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: c.color }}
                />
                {c.name}
                <span className="text-faint tabular-nums">{c.count}</span>
              </span>
            ))}
          </div>
        )}

        {/* Skills */}
        {profile.skills.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center gap-3">
              <p className="eyebrow">Skills, evidenced</p>
              <div className="rule-fade flex-1" />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {profile.skills.map((s) => (
                <span
                  key={s.name}
                  className="pill text-graphite"
                  // Weight tracks how many records back the skill up.
                  style={{ fontWeight: 400 + Math.min(s.count, 4) * 50 }}
                >
                  {s.name}
                  {s.count > 1 && (
                    <span className="text-faint tabular-nums">{s.count}</span>
                  )}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Journey */}
        <section className="mt-12 space-y-10">
          {profile.years.map(({ year, items }) => (
            <div key={year}>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="font-display text-[1.375rem] font-semibold tabular-nums">
                  {year}
                </h2>
                <div className="rule-fade flex-1" />
                <span className="text-[0.8125rem] text-faint tabular-nums">
                  {items.length}
                </span>
              </div>

              <ol className="space-y-3">
                {items.map((item) => (
                  <li key={item.id} className="card p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="pill text-muted">{item.category}</span>
                      <span className="inline-flex items-center gap-1.5 text-[0.8125rem] text-faint">
                        <Calendar size={12} />
                        {formatDate(item.date)}
                      </span>
                      {item.organization && (
                        <span className="text-[0.8125rem] text-faint">
                          {item.organization}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2.5 text-[1.0625rem] leading-snug font-semibold text-balance">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted text-pretty">
                      {item.summary}
                    </p>

                    {item.highlights.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
                        {item.highlights.slice(0, 4).map((h) => (
                          <li key={h} className="text-[0.8125rem] text-faint">
                            · {h}
                          </li>
                        ))}
                      </ul>
                    )}

                    {item.skills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.skills.slice(0, 6).map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-mist px-2 py-0.5 text-[0.75rem] font-medium text-graphite"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>

        {profile.totals.records === 0 && (
          <p className="py-16 text-center text-[1rem] text-faint">
            This profile has nothing public yet.
          </p>
        )}

        {/* Closing */}
        <div className="slab mt-16 px-6 py-12 text-center">
          <p className="relative inline-flex items-center gap-2 text-[0.8125rem] font-semibold tracking-[0.14em] text-white/45 uppercase">
            <Sparkles size={13} />
            Built with Chronicle
          </p>
          <h2 className="relative mt-4 text-[1.5rem] leading-tight font-semibold text-balance sm:text-[1.875rem]">
            Make your own journey searchable.
          </h2>
          <Link
            href="/"
            className="btn btn-invert relative mt-6 !px-6 !py-3"
          >
            Start your Chronicle
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </main>
    </div>
  );
}
