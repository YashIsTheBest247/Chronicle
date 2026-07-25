import "server-only";
import type { Item } from "./types";

/**
 * A record can carry several URLs: the one it was created from (`items.url`,
 * set when a link rather than a file was ingested) and any URLs the extraction
 * layer found written inside the document (`items.links`). "Send me the link"
 * is therefore ambiguous by default — a project might have a repository, a
 * deployed demo and a demo video.
 *
 * This module turns that raw list into labelled links, so an answer can say
 * *what each link is for* instead of pasting three bare URLs and leaving the
 * reader to open all of them.
 */

export interface RecordLink {
  url: string;
  /** What the link points at — "GitHub repository", "Live demo", "Credential". */
  label: string;
  /** Single glyph so a list of links stays scannable in a chat message. */
  icon: string;
  /**
   * True for the URL the record itself was created from. Listed first: it is
   * the link the user chose, the rest were only mentioned by the document.
   */
  primary: boolean;
}

/**
 * Hostname → what it is. Matched against a hostname with `www.` already
 * stripped, first hit wins, so more specific patterns come first.
 */
const HOSTS: [RegExp, string, string][] = [
  [/^gist\.github\.com$/, "Code gist", "📄"],
  [/^colab\.research\.google\.com$/, "Colab notebook", "📓"],
  [/^(gitlab\.com|bitbucket\.org|sourceforge\.net)$/, "Code repository", "💻"],
  // Anything on a hosting platform's own domain is a deployment, not a repo.
  [
    /(^|\.)(vercel\.app|netlify\.app|onrender\.com|github\.io|pages\.dev|herokuapp\.com|fly\.dev|streamlit\.app|web\.app|firebaseapp\.com|glitch\.me|surge\.sh|replit\.app)$/,
    "Live demo",
    "🌐",
  ],
  [
    /^(replit\.com|codesandbox\.io|codepen\.io|stackblitz\.com)$/,
    "Live demo",
    "🌐",
  ],
  [/^(youtube\.com|youtu\.be|vimeo\.com|loom\.com)$/, "Video demo", "▶️"],
  [/^(drive|docs)\.google\.com$/, "Google Drive document", "📄"],
  [/^(notion\.so|notion\.site)$|\.notion\.site$/, "Notion page", "📄"],
  [/^overleaf\.com$/, "LaTeX document", "📄"],
  [/^(credly\.com|badgr\.com|accredible\.com)$|^verify\./, "Credential", "🎓"],
  [/^coursera\.org$/, "Coursera certificate", "🎓"],
  [/^udemy\.com$/, "Udemy certificate", "🎓"],
  [/^edx\.org$/, "edX certificate", "🎓"],
  [/^(nptel\.ac\.in|swayam\.gov\.in|onlinecourses\.nptel\.ac\.in)$/, "NPTEL certificate", "🎓"],
  [/^freecodecamp\.org$/, "freeCodeCamp certificate", "🎓"],
  [/^(hackerrank\.com|leetcode\.com|codechef\.com|codeforces\.com)$/, "Coding profile", "👤"],
  [/^kaggle\.com$/, "Kaggle profile", "👤"],
  [/^huggingface\.co$/, "Hugging Face page", "🤗"],
  [/^(devpost\.com|devfolio\.co|unstop\.com)$/, "Hackathon project", "🏆"],
  [/^(npmjs\.com|pypi\.org|hub\.docker\.com|crates\.io)$/, "Published package", "📦"],
  [/^(arxiv\.org|dl\.acm\.org|ieeexplore\.ieee\.org|doi\.org)$/, "Paper", "📄"],
  [/^scholar\.google\.com$/, "Google Scholar profile", "👤"],
  [/^(orcid\.org|researchgate\.net)$/, "Research profile", "👤"],
  [/^stackoverflow\.com$/, "Stack Overflow profile", "👤"],
  [/^(twitter\.com|x\.com|instagram\.com|facebook\.com|t\.me)$/, "Social profile", "👤"],
  [/^(figma\.com|behance\.net|dribbble\.com)$/, "Design work", "🎨"],
  [
    /^(medium\.com|dev\.to|substack\.com)$|\.(hashnode\.dev|medium\.com|substack\.com|wordpress\.com|blogspot\.com)$/,
    "Article",
    "✍️",
  ],
];

/** Path shapes that mean "this proves a credential", whoever is hosting it. */
const CREDENTIAL_PATH = /\b(verify|verification|credential|certificate|badges?)\b/i;

/** Names what a single URL is for, from its host and path alone. */
export function classifyLink(url: string): { label: string; icon: string } {
  if (EMAIL.test(url)) return { label: "Email address", icon: "✉️" };

  let host: string;
  let path: string;
  try {
    const u = new URL(url);
    host = u.hostname.replace(/^www\./, "").toLowerCase();
    path = u.pathname.replace(/\/+$/, "");
  } catch {
    return { label: "Link", icon: "🔗" };
  }

  // GitHub is worth splitting three ways: a repository, a profile and a Pages
  // site are three different answers to "what is this link for".
  if (host === "github.com") {
    const parts = path.split("/").filter(Boolean);
    if (parts.length >= 2) return { label: "GitHub repository", icon: "💻" };
    if (parts.length === 1) return { label: "GitHub profile", icon: "👤" };
    return { label: "GitHub", icon: "💻" };
  }
  if (host === "linkedin.com") {
    return path.startsWith("/in/")
      ? { label: "LinkedIn profile", icon: "👤" }
      : { label: "LinkedIn post", icon: "👤" };
  }

  for (const [re, label, icon] of HOSTS) {
    if (re.test(host)) return { label, icon };
  }

  // Small issuers all host their own verification pages, so the path is the
  // only signal left. Checked after the table so a known platform names itself.
  if (CREDENTIAL_PATH.test(path)) return { label: "Credential", icon: "🎓" };

  // No rule matched: the hostname is still a more useful label than "Link",
  // because it is what the user would recognise.
  return { label: host, icon: "🔗" };
}

/**
 * Every link on a record, de-duplicated and labelled. The record's own URL
 * comes first; document links follow in the order they were extracted.
 */
export function linksFor(item: Pick<Item, "url" | "links">): RecordLink[] {
  const out: RecordLink[] = [];
  const seen = new Set<string>();

  const add = (raw: string, primary: boolean) => {
    const url = normalise(raw);
    if (!url) return;
    const key = dedupeKey(url);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ url, ...classifyLink(url), primary });
  };

  if (item.url) add(item.url, true);
  for (const raw of item.links ?? []) add(raw, false);
  return out;
}

/**
 * Reads a user-typed address into a canonical http(s) URL, or null if it is
 * not one. Accepts a bare domain — "drive.google.com/file/d/…" pasted without
 * a scheme is what a paste from an address bar actually looks like.
 *
 * Private and link-local hosts are refused. The server fetches whatever URL a
 * record is created from, so without this an address like the cloud metadata
 * endpoint would make the ingest pipeline fetch it on the caller's behalf.
 */
export function toHttpUrl(raw: string): string | null {
  const url = normalise(raw);
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    return isPrivateHost(new URL(url).hostname) ? null : url;
  } catch {
    return null;
  }
}

/** Loopback, private, link-local and multicast addresses, plus internal names. */
function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");

  if (
    host === "localhost" ||
    /\.(localhost|local|internal|intranet|home\.arpa)$/.test(host)
  ) {
    return true;
  }

  // IPv6 loopback, unique-local (fc00::/7) and link-local (fe80::/10).
  if (host === "::1" || /^f[cd]/.test(host) || /^fe[89ab]/.test(host)) return true;

  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!v4) return false;
  const [a, b] = [Number(v4[1]), Number(v4[2])];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

/** True when the question is asking for a URL rather than a document. */
export function isLinkQuery(text: string): boolean {
  return LINK_QUERY.test(text);
}

/**
 * Deliberately generous. A false positive costs a few extra lines of URLs in
 * an answer that already found the right records; a false negative means the
 * user asked for a link and got a file button instead. Hindi terms are matched
 * too, since the bot answers in whichever language it was asked.
 */
const LINK_QUERY =
  /\b(links?|urls?|repos?|repositor(?:y|ies)|github|gitlab|linkedin|portfolios?|websites?|webpages?|demos?|deployed|hosted|credential|verif(?:y|ication))\b|लिंक|यूआरएल|वेबसाइट|कड़ी/i;

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/**
 * Accepts what the extraction layer actually produces: a bare domain, a URL
 * with prose punctuation stuck to either end, a plain email address. Anything
 * that cannot be read as an address is dropped rather than shown broken.
 */
function normalise(raw: string): string {
  // Brackets and sentence punctuation survive when a URL is lifted out of prose.
  const trimmed = raw.trim().replace(/^[([{<'"]+/, "").replace(/[)\]}.,;:'"<>]+$/, "");
  if (!trimmed) return "";
  // Kept bare rather than as mailto: — chat clients link an address on sight,
  // and the address is what the user wants to read and copy.
  if (EMAIL.test(trimmed)) return trimmed;
  if (/^mailto:/i.test(trimmed)) {
    const address = trimmed.slice(7);
    return EMAIL.test(address) ? address : "";
  }

  try {
    const u = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    // A host with no dot is a fragment or a typo, not an address.
    if (!u.hostname.includes(".")) return "";
    const full = u.toString();
    // Drop the slash URL() appends to a bare domain — it reads as a typo.
    return u.pathname === "/" && !u.search && !u.hash
      ? full.replace(/\/$/, "")
      : full;
  } catch {
    return "";
  }
}

/** Scheme, `www.` and a trailing slash are not differences worth showing twice. */
function dedupeKey(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    return `${host}${u.pathname.replace(/\/+$/, "")}${u.search}`;
  } catch {
    return url.toLowerCase();
  }
}
