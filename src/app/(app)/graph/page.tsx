"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { CategoryPill } from "@/components/CategoryPill";
import { CATEGORIES, CATEGORY_COLOR } from "@/lib/types";
import { useCategoryLabel, useT } from "@/lib/i18n";

interface GNode {
  id: string;
  label: string;
  category: string;
  color: string;
  date: string | null;
  organization: string | null;
  skills: string[];
  degree: number;
}

interface GLink {
  id: string;
  source: string;
  target: string;
  kind: string;
  label: string;
  weight: number;
  reason: string;
}

/** Simulation state kept outside React — it mutates every frame. */
interface Body extends GNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export default function GraphPage() {
  const { t } = useT();
  const catLabel = useCategoryLabel();
  const [data, setData] = useState<{ nodes: GNode[]; links: GLink[] } | null>(
    null,
  );
  const [selected, setSelected] = useState<GNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bodiesRef = useRef<Body[]>([]);
  const hoverRef = useRef<string | null>(null);
  // Selection is read inside the animation loop. Keeping it in a ref means
  // clicking a node repaints the highlight without restarting the layout.
  const selectedRef = useRef<string | null>(null);

  useEffect(() => {
    selectedRef.current = selected?.id ?? null;
  }, [selected]);

  useEffect(() => {
    fetch("/api/graph")
      .then((r) => r.json())
      .then(setData);
  }, []);

  const connectedTo = useMemo(() => {
    if (!data || !selected) return new Set<string>();
    const set = new Set<string>();
    for (const l of data.links) {
      if (l.source === selected.id) set.add(l.target);
      if (l.target === selected.id) set.add(l.source);
    }
    return set;
  }, [data, selected]);

  const selectedLinks = useMemo(() => {
    if (!data || !selected) return [];
    return data.links
      .filter((l) => l.source === selected.id || l.target === selected.id)
      .map((l) => ({
        link: l,
        other: data.nodes.find(
          (n) => n.id === (l.source === selected.id ? l.target : l.source),
        ),
      }))
      .filter((x) => x.other)
      .sort((a, b) => b.link.weight - a.link.weight);
  }, [data, selected]);

  // ---- Force simulation --------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.nodes.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    // Seed on a circle so the layout unfolds outward instead of exploding.
    bodiesRef.current = data.nodes.map((n, i) => {
      const angle = (i / data.nodes.length) * Math.PI * 2;
      const radius = Math.min(width, height) * 0.28;
      return {
        ...n,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        r: 7 + Math.min(n.degree, 8) * 1.7,
      };
    });

    const byId = new Map(bodiesRef.current.map((b) => [b.id, b]));
    let alpha = 1;
    let raf = 0;

    function step() {
      const bodies = bodiesRef.current;
      alpha *= 0.994; // cools to a resting layout rather than jittering forever

      // Repulsion — every pair pushes apart, softened at close range.
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          const a = bodies[i];
          const b = bodies[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist = Math.hypot(dx, dy) || 0.01;
          if (dist > 320) continue;
          const force = (2400 / (dist * dist)) * alpha;
          dx /= dist;
          dy /= dist;
          a.vx -= dx * force;
          a.vy -= dy * force;
          b.vx += dx * force;
          b.vy += dy * force;
        }
      }

      // Attraction along edges — stronger edges pull to a shorter rest length.
      for (const l of data!.links) {
        const a = byId.get(l.source);
        const b = byId.get(l.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const rest = 150 - l.weight * 55;
        const force = ((dist - rest) * 0.0055 * l.weight) * alpha;
        const ux = (dx / dist) * force;
        const uy = (dy / dist) * force;
        a.vx += ux;
        a.vy += uy;
        b.vx -= ux;
        b.vy -= uy;
      }

      // Gentle pull to centre keeps disconnected nodes from drifting off-canvas.
      for (const b of bodies) {
        b.vx += (width / 2 - b.x) * 0.0016 * alpha;
        b.vy += (height / 2 - b.y) * 0.0016 * alpha;
        b.vx *= 0.86;
        b.vy *= 0.86;
        b.x += b.vx;
        b.y += b.vy;
        b.x = Math.max(b.r + 4, Math.min(width - b.r - 4, b.x));
        b.y = Math.max(b.r + 4, Math.min(height - b.r - 4, b.y));
      }

      draw();
      raf = requestAnimationFrame(step);
    }

    function draw() {
      const bodies = bodiesRef.current;
      const dark = document.documentElement.classList.contains("dark");
      const focus = selectedRef.current ?? hoverRef.current;

      ctx!.clearRect(0, 0, width, height);

      // Edges first so nodes always sit on top of them.
      for (const l of data!.links) {
        const a = byId.get(l.source);
        const b = byId.get(l.target);
        if (!a || !b) continue;
        const touched = !focus || l.source === focus || l.target === focus;
        ctx!.beginPath();
        ctx!.moveTo(a.x, a.y);
        ctx!.lineTo(b.x, b.y);
        ctx!.strokeStyle = touched
          ? dark
            ? `rgba(160,156,147,${0.2 + l.weight * 0.45})`
            : `rgba(103,100,93,${0.16 + l.weight * 0.4})`
          : dark
            ? "rgba(160,156,147,0.06)"
            : "rgba(103,100,93,0.05)";
        ctx!.lineWidth = touched ? 0.6 + l.weight * 1.5 : 0.5;
        ctx!.stroke();
      }

      for (const b of bodies) {
        const touched =
          !focus || b.id === focus || isNeighbour(b.id, focus, data!.links);

        ctx!.globalAlpha = touched ? 1 : 0.22;

        // Halo marks the focused node without changing its size.
        if (b.id === focus) {
          ctx!.beginPath();
          ctx!.arc(b.x, b.y, b.r + 6, 0, Math.PI * 2);
          ctx!.fillStyle = `${b.color}22`;
          ctx!.fill();
        }

        ctx!.beginPath();
        ctx!.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx!.fillStyle = b.color;
        ctx!.fill();
        ctx!.strokeStyle = dark ? "#0E0D0B" : "#FFFFFF";
        ctx!.lineWidth = 2;
        ctx!.stroke();

        // Only label what the reader can actually take in: hubs and focus.
        if (b.r > 10 || b.id === focus) {
          ctx!.font =
            '500 11px "Hanken Grotesk", system-ui, sans-serif';
          ctx!.textAlign = "center";
          ctx!.fillStyle = dark ? "#EDEBE7" : "#16140F";
          const label =
            b.label.length > 26 ? `${b.label.slice(0, 25)}…` : b.label;
          ctx!.fillText(label, b.x, b.y + b.r + 13);
        }

        ctx!.globalAlpha = 1;
      }
    }

    function pick(e: MouseEvent): Body | null {
      const rect = canvas!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      return (
        bodiesRef.current.find((b) => Math.hypot(b.x - x, b.y - y) <= b.r + 5) ??
        null
      );
    }

    function onMove(e: MouseEvent) {
      const hit = pick(e);
      hoverRef.current = hit?.id ?? null;
      canvas!.style.cursor = hit ? "pointer" : "default";
    }

    function onClick(e: MouseEvent) {
      const hit = pick(e);
      const node = hit ? data!.nodes.find((n) => n.id === hit.id)! : null;
      selectedRef.current = node?.id ?? null;
      setSelected(node);
      // Nudge the layout so it settles around the new focus without resetting.
      alpha = Math.max(alpha, 0.18);
    }

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("click", onClick);
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("click", onClick);
      window.removeEventListener("resize", resize);
    };
    // Deliberately excludes `selected` — see selectedRef above.
  }, [data]);

  if (!data) {
    return (
      <div className="grid place-items-center py-32 text-faint">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  if (data.nodes.length === 0) {
    return (
      <p className="py-32 text-center text-[1rem] text-faint">
        {t("graph.empty")}{" "}
        <Link href="/upload" className="inline-block py-1.5 text-fg underline underline-offset-4">
          {t("graph.addFew")}
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t("graph.eyebrow")}</p>
          <h1 className="t-page mt-2">
            {data.nodes.length} {t("dash.records")}, {data.links.length} {t("dash.connections")}
          </h1>
          <p className="mt-1 text-[0.9375rem] text-muted">
            {t("graph.sub")}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.filter((c) =>
            data.nodes.some((n) => n.category === c),
          ).map((c) => (
            <span key={c} className="pill text-muted">
              <span
                className="size-1.5 rounded-full"
                style={{ background: CATEGORY_COLOR[c] }}
              />
              {catLabel(c)}
            </span>
          ))}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_19rem]">
        <div className="card overflow-hidden p-0">
          <canvas
            ref={canvasRef}
            className="h-[24rem] w-full sm:h-[30rem] lg:h-[34rem]"
            aria-label="Force-directed graph of your records and their relationships"
          />
        </div>

        <aside className="card h-fit p-5">
          {selected ? (
            <div className="space-y-4">
              <div>
                <CategoryPill category={selected.category} />
                <h2 className="mt-2.5 text-[1.125rem] leading-snug font-semibold text-balance">
                  {selected.label}
                </h2>
                {selected.organization && (
                  <p className="mt-1 text-[0.875rem] text-muted">
                    {selected.organization}
                  </p>
                )}
              </div>

              <div>
                <p className="eyebrow">
                  {selectedLinks.length}{" "}
                  {selectedLinks.length === 1
                    ? t("graph.connection")
                    : t("graph.connectionsN")}
                </p>
                <ul className="mt-2.5 space-y-2.5">
                  {selectedLinks.map(({ link, other }) => (
                    <li key={link.id}>
                      <p className="text-[0.75rem] tracking-wide text-faint uppercase">
                        {link.label}
                      </p>
                      <Link
                        href={`/record/${other!.id}`}
                        className="text-[0.875rem] leading-snug font-medium hover:underline"
                      >
                        {other!.label}
                      </Link>
                      <p className="text-[0.8125rem] text-faint">{link.reason}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={`/record/${selected.id}`}
                className="btn btn-ghost w-full !py-2 !text-sm"
              >
                {t("graph.open")}
              </Link>
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-[0.9375rem] text-muted">
                {t("graph.select")}
              </p>
              <p className="mt-3 text-[0.875rem] text-faint text-pretty">
                {t("graph.hint")}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function isNeighbour(id: string, focus: string, links: GLink[]): boolean {
  return links.some(
    (l) =>
      (l.source === focus && l.target === id) ||
      (l.target === focus && l.source === id),
  );
}
