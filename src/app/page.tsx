import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  FileText,
  GraduationCap,
  Languages,
  Link2,
  Search,
  Upload,
  Users,
  Waypoints,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { SiteNav } from "@/components/SiteNav";
import { HeroVisual } from "@/components/HeroVisual";
import { Reveal } from "@/components/Reveal";
import { TelegramButton } from "@/components/TelegramButton";

export default function Landing() {
  return (
    <div className="min-h-dvh">
      <SiteNav />
      <Hero />
      <Problem />
      <Modules />
      <HowItWorks />
      <Retrieval />
      <Closer />
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ hero -- */

function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-dvh items-center overflow-hidden bg-[#16140F] text-[#EDEBE7]"
    >
      {/* Full-bleed photograph. priority + sizes so the LCP image is fetched
          immediately at the right resolution rather than after hydration. */}
      <Image
        src="/hero.jpg"
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      {/* Two-stage scrim: a horizontal wash keeps the left column legible,
          a vertical one seats the nav on top and hands off to the section
          below. Without both, white text lands on the photo's bright areas. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[#0E0D0B]/78 lg:hidden"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden lg:block"
        style={{
          background:
            "linear-gradient(90deg, rgba(14,13,11,0.94) 0%, rgba(14,13,11,0.88) 34%, rgba(14,13,11,0.42) 60%, rgba(14,13,11,0.06) 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(14,13,11,0.72) 0%, rgba(14,13,11,0.10) 26%, rgba(14,13,11,0.10) 70%, rgba(14,13,11,0.85) 100%)",
        }}
      />

      {/* Text left, record panel right. Vertical padding is kept modest so
          the whole hero clears one viewport instead of spilling past it. */}
      <div className="relative mx-auto w-full max-w-6xl px-5 pt-24 pb-14 sm:px-6 sm:pt-28 lg:pt-24 lg:pb-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
          <div className="min-w-0">
            {/* Breaks are explicit, so text-balance must stay off here. */}
            <h1 className="animate-rise t-hero font-semibold">
              Your whole journey,
              <br />
              <span className="accent font-normal text-white/55">
                instantly findable
              </span>
            </h1>

            <p className="animate-rise t-sub mt-6 max-w-lg text-white/70 text-pretty">
              Four years of certificates, projects and letters, read and
              connected into one graph you can ask questions of.
            </p>

            <p className="animate-rise mt-6 text-[0.8125rem] font-semibold tracking-[0.16em] text-white/40 uppercase">
              Understands · Organises · Connects · Retrieves
            </p>

            <div className="animate-rise mt-8 flex flex-wrap items-center gap-3 lg:flex-nowrap">
              <Link
                href="/upload"
                className="btn btn-invert w-full !px-5 !py-3 sm:w-auto"
              >
                Start your Chronicle
                <ArrowUpRight size={16} />
              </Link>
              <Link
                href="/dashboard"
                className="btn w-full border border-white/20 !px-5 !py-3 text-white hover:bg-white/10 sm:w-auto"
              >
                See the demo
              </Link>
              <TelegramButton className="btn w-full border border-white/20 !px-5 !py-3 text-white hover:bg-white/10 sm:w-auto" />
            </div>

            {/* One line, always: a colour cluster standing in for the six
                categories, then the two facts people actually ask about.
                Six individual pills wrapped to a second row and pushed the
                hero past the fold. */}
            <div className="animate-rise mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[0.9375rem] text-white/55">
              <span className="inline-flex items-center gap-1.5">
                <FileText size={14} />
                Reads PDFs &amp; scans
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Languages size={14} />
                English &amp; Hindi
              </span>
            </div>
          </div>

          {/* Hidden below lg: stacked under the copy it would only lengthen
              an already-full viewport. */}
          <div className="animate-rise hidden min-w-0 lg:block">
            <HeroVisual />
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- problem -- */

function Problem() {
  const rows = [
    { before: "certificate_final_v2.pdf", after: "Deep Learning Specialization" },
    { before: "Screenshot 2024-08-11.png", after: "Hackathon — Regional Winner" },
    { before: "letter (3).pdf", after: "Internship at Wooble" },
    { before: "resume_updated_FINAL.docx", after: "Résumé — 2026" },
  ];

  return (
    <section className="bg-canvas py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <Reveal>
          <span className="pill text-muted">
            <Users size={12} />
            FOR STUDENTS
          </span>
        </Reveal>

        <Reveal delay={60}>
        <h2 className="t-section mt-5 max-w-3xl font-semibold text-balance">
          Storage remembers files.
          <br />
          It doesn&apos;t remember{" "}
          <span className="accent font-normal text-muted">you</span>.
        </h2>
        </Reveal>

        <Reveal delay={110}>
        <p className="t-sub mt-4 max-w-2xl text-muted text-pretty">
          A drive can hold a certificate for three years and still not know
          it&apos;s the reason you got the internship. Chronicle models the
          journey, not the directory — so a filename stops being the only thing
          your history knows about itself.
        </p>
        </Reveal>

        <div className="mt-9 grid gap-4 sm:grid-cols-2">
          {rows.map((row, i) => (
            <Reveal
              key={row.before}
              delay={i * 70}
              className="card pressable flex items-center gap-4 p-5 sm:p-6"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[0.875rem] text-faint line-through decoration-1">
                  {row.before}
                </p>
                <p className="mt-2 truncate text-[1.0625rem] font-semibold">
                  {row.after}
                </p>
              </div>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#2E6F52]/12 text-[#2E6F52]">
                <Check size={15} />
              </span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- modules -- */

function Modules() {
  const modules = [
    {
      icon: Upload,
      title: "Ingest anything",
      body: "PDFs, photos of certificates, transcripts, DOCX, and portfolio links. Scans are read natively — there is no OCR step to configure.",
      color: "#2D6BFF",
    },
    {
      icon: GraduationCap,
      title: "Categorise itself",
      body: "Every upload lands in Projects, Skills, Certifications, Internships, Achievements or Academics. You never file anything by hand.",
      color: "#2E6F52",
    },
    {
      icon: Waypoints,
      title: "Connect the dots",
      body: "A certification proves a skill; a skill is applied in a project; a project leads to an internship. The graph assembles itself.",
      color: "#138A72",
    },
    {
      icon: Search,
      title: "Ask in plain English",
      body: "“Show my AI projects.” “My latest resume.” Vector retrieval over embeddings, not filename matching.",
      color: "#6D4AA7",
    },
    {
      icon: FileText,
      title: "Originals, untouched",
      body: "Every source file is preserved byte-for-byte and downloadable in its original format, forever.",
      color: "#B07A1E",
    },
    {
      icon: Link2,
      title: "One shareable identity",
      body: "A timeline and a knowledge graph that explain not just what you did, but how each thing led to the next.",
      color: "#C2641F",
    },
  ];

  return (
    <section id="modules" className="bg-mist/60 py-12 sm:py-16 dark:bg-panel/60">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <Reveal>
          <h2 className="t-section max-w-2xl font-semibold text-balance">
            Six things,{" "}
            <span className="accent font-normal text-muted">one system</span>.
          </h2>
        </Reveal>

        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(({ icon: Icon, title, body, color }, i) => (
            <Reveal key={title} delay={i * 60} className="card pressable p-7">
              <span
                className="grid size-11 place-items-center rounded-full"
                style={{ background: `${color}1A`, color }}
              >
                <Icon size={19} />
              </span>
              <h3 className="mt-5 text-[1.1875rem] font-semibold">{title}</h3>
              <p className="mt-2.5 text-[1rem] leading-relaxed text-muted text-pretty">
                {body}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- how it works -- */

function HowItWorks() {
  return (
    <section id="how" className="bg-canvas py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <Reveal>
          <h2 className="t-section font-semibold text-balance">
            How Chronicle works
          </h2>
          <p className="t-sub mt-4 max-w-xl text-muted text-pretty">
            No folders. No tagging. Drop a file in and it files itself.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Step
            n="01"
            title="Drop in a document"
            body="A certificate, a project report, an internship letter, or a portfolio link. PDFs and photos go straight to Gemini as bytes."
            mock={<MockUpload />}
          />
          <Step
            n="02"
            title="Gemini reads it"
            body="Structured extraction returns the title, issuer, dates, canonical skills and measurable outcomes — never invented, only what the document supports."
            mock={<MockExtract />}
          />
          <Step
            n="03"
            title="It joins the graph"
            body="Shared skills and issuers create provable edges. Semantic neighbours are labelled with a real relationship: proves, applies, led to."
            mock={<MockGraph />}
          />
          <Step
            n="04"
            title="Ask for it back"
            body="Your question becomes filters plus a vector search over pgvector, answered in a sentence with the originals attached."
            mock={<MockSearch />}
          />
        </div>
      </div>
    </section>
  );
}

function Step({
  n,
  title,
  body,
  mock,
}: {
  n: string;
  title: string;
  body: string;
  mock: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col p-5">
      <div className="panel mb-6 min-h-[9.5rem] p-4">{mock}</div>
      <span className="font-display text-[2rem] leading-none font-semibold text-[#2D6BFF]/35">
        {n}
      </span>
      <h3 className="mt-3 text-[1.125rem] leading-snug font-semibold text-balance">
        {title}
      </h3>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted text-pretty">
        {body}
      </p>
    </div>
  );
}

/* Miniature UI stills. Deliberately static — they illustrate the step
   rather than pretending to be a live widget. */

function MockUpload() {
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {[FileText, Upload, Link2].map((Icon, i) => (
          <span
            key={i}
            className="grid size-8 place-items-center rounded-lg border border-line bg-paper text-faint"
          >
            <Icon size={14} />
          </span>
        ))}
      </div>
      <div className="rounded-lg border border-dashed border-line bg-paper px-3 py-2.5 text-[0.75rem] text-faint">
        certificate.pdf · 412 KB
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full w-2/3 rounded-full bg-[#2D6BFF]" />
      </div>
    </div>
  );
}

function MockExtract() {
  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-line bg-paper px-2.5 py-2">
        <p className="text-[0.6875rem] tracking-wide text-faint uppercase">
          Category
        </p>
        <p className="mt-0.5 text-[0.8125rem] font-semibold">Certifications</p>
      </div>
      <div className="flex flex-wrap gap-1">
        {["Python", "SQL", "Pandas"].map((s) => (
          <span
            key={s}
            className="rounded-full bg-paper px-2 py-0.5 text-[0.6875rem] font-medium text-graphite"
          >
            {s}
          </span>
        ))}
      </div>
      <p className="text-[0.6875rem] text-[#2E6F52]">✓ 96% · Mar 2023</p>
    </div>
  );
}

function MockGraph() {
  return (
    <svg viewBox="0 0 140 96" className="h-full w-full" aria-hidden="true">
      <line x1="28" y1="26" x2="70" y2="52" stroke="#67605D" strokeWidth="1" opacity="0.4" />
      <line x1="70" y1="52" x2="112" y2="28" stroke="#67605D" strokeWidth="1" opacity="0.4" />
      <line x1="70" y1="52" x2="52" y2="82" stroke="#67605D" strokeWidth="1" opacity="0.4" />
      <circle cx="28" cy="26" r="8" fill="#B07A1E" />
      <circle cx="70" cy="52" r="11" fill="#138A72" />
      <circle cx="112" cy="28" r="8" fill="#2D6BFF" />
      <circle cx="52" cy="82" r="7" fill="#6D4AA7" />
      <text x="70" y="16" textAnchor="middle" fill="#9A968E" fontSize="7">
        proves → applies
      </text>
    </svg>
  );
}

function MockSearch() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1.5">
        <Search size={11} className="shrink-0 text-faint" />
        <span className="truncate text-[0.75rem] text-graphite">
          my AI projects
        </span>
      </div>
      {[
        { c: "#2D6BFF", w: "w-full" },
        { c: "#C2641F", w: "w-4/5" },
        { c: "#6D4AA7", w: "w-3/5" },
      ].map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ background: r.c }}
          />
          <span className={`h-1.5 rounded-full bg-line ${r.w}`} />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- retrieval -- */

function Retrieval() {
  const results = [
    {
      title: "Deep Learning Specialization",
      meta: "Certification · DeepLearning.AI · May 2024",
      color: "#B07A1E",
    },
    {
      title: "Smart India Hackathon — Regional Winner",
      meta: "Achievement · Govt. of India · Aug 2024",
      color: "#C2641F",
    },
    {
      title: "ML Intern — Wooble",
      meta: "Internship · Wooble · Jan 2025",
      color: "#6D4AA7",
    },
  ];

  return (
    <section id="retrieval" className="bg-mist/60 py-12 sm:py-16 dark:bg-panel/60">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div>
            <span className="pill text-muted">
              <Search size={12} />
              INSTANT RETRIEVAL
            </span>
            <h2 className="t-section mt-6 font-semibold text-balance">
              Ask the way you&apos;d ask{" "}
              <span className="accent font-normal text-muted">a friend</span>.
            </h2>
            <p className="t-sub mt-5 max-w-md text-muted text-pretty">
              Your question is parsed into filters, ranked by an HNSW vector
              index in Postgres, boosted by exact matches, and answered in a
              sentence — with every original one click away.
            </p>
            <Link href="/search" className="btn btn-primary mt-8 !px-6 !py-3.5">
              Try it on the demo journey
              <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="card overflow-hidden p-0 shadow-[0_28px_80px_-48px_rgb(22_20_15_/_0.45)]">
            <div className="flex items-center gap-3 border-b border-lineSoft px-5 py-4">
              <Search size={16} className="shrink-0 text-faint" />
              <span className="text-[1rem] text-fg">
                everything that proves I know machine learning
              </span>
            </div>

            <div className="border-b border-lineSoft bg-linen/60 px-5 py-4 dark:bg-mist/30">
              <p className="text-[0.9375rem] leading-relaxed text-graphite">
                Three records establish it: the DeepLearning.AI specialization
                certifies the theory, the hackathon win applies it in the field,
                and the Wooble internship shipped it to production.
              </p>
            </div>

            <div className="divide-y divide-lineSoft">
              {results.map((r) => (
                <div key={r.title} className="flex items-center gap-3 px-5 py-3.5">
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ background: r.color }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[0.9375rem] font-medium">
                      {r.title}
                    </p>
                    <p className="truncate text-[0.8125rem] text-faint">{r.meta}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- closer -- */

function Closer() {
  return (
    <section className="bg-canvas px-4 py-10 sm:px-6 sm:py-14">
      <div className="slab mx-auto max-w-6xl px-6 py-14 text-center sm:py-16 lg:py-20">
        <div className="relative">
          <h2 className="t-section mx-auto max-w-3xl font-semibold text-balance">
            &ldquo;I never have to search through folders{" "}
            <span className="accent font-normal text-white/55">again</span>.&rdquo;
          </h2>
          <p className="t-sub mx-auto mt-4 max-w-lg text-white/60 text-pretty">
            Put four years in once. Ask for any of it in plain English forever
            after.
          </p>
          <Link
            href="/upload"
            className="btn btn-invert mt-7 !px-6 !py-3"
          >
            Start your Chronicle
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- footer -- */

function Footer() {
  const columns = [
    {
      title: "Product",
      links: [
        { href: "/dashboard", label: "Overview" },
        { href: "/timeline", label: "Timeline" },
        { href: "/graph", label: "Knowledge graph" },
        { href: "/search", label: "Search" },
      ],
    },
    {
      title: "Modules",
      links: [
        { href: "/upload", label: "Ingestion" },
        { href: "#modules", label: "Categorisation" },
        { href: "#how", label: "Relationship engine" },
        { href: "#retrieval", label: "Retrieval" },
      ],
    },
  ];

  return (
    <footer className="relative overflow-hidden bg-[#16140F] text-[#EDEBE7]">
      {/* Wordmark sits behind the footer and is cropped by the page's bottom
          edge, so the page still ends at the bottom bar. */}
      <span
        aria-hidden="true"
        className="watermark bottom-[-0.22em] z-0"
      >
        Chronicle
      </span>

      <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-6">
        {/* Masthead — the wordmark runs full-bleed behind the closing line,
            so the footer opens with the brand rather than trailing off. */}
        <div className="pt-14 pb-10 sm:pt-16 sm:pb-12">
          <h2 className="t-section max-w-xl font-semibold text-white">
            Your journey,
            <br />
            made searchable.
          </h2>
        </div>

        <div className="grid gap-10 border-t border-white/10 pt-12 pb-14 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <Logo href={null} className="text-white" />
            <p className="mt-4 max-w-xs text-[0.9375rem] leading-relaxed text-white/50 text-pretty">
              An AI digital identity system that understands a student&apos;s
              growth, achievements, skills and experiences — and makes every one
              of them instantly retrievable.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-[0.875rem] font-semibold text-[#2D6BFF]">
                {col.title}
              </p>
              <ul className="mt-3 space-y-1">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="inline-block py-1.5 text-[0.9375rem] text-white/55 transition-colors hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 py-7">
          <p className="text-[0.875rem] text-white/40">
            © 2026 Chronicle · Originals preserved, never rewritten
          </p>
          <Link
            href="/upload"
            className="pill pressable !py-2 border-white/15 text-white/70 hover:bg-white/10 hover:text-white"
          >
            Start your Chronicle
            <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>
    </footer>
  );
}
