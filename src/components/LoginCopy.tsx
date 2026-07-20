"use client";

import { useT } from "@/lib/i18n";

/**
 * Login's text lives here because the page itself must stay a server
 * component — it defines the sign-in server action — while translations are
 * client state.
 */
export function LoginCopy({ part }: { part: "title" | "body" | "google" | "note" | "back" }) {
  const { t } = useT();
  if (part === "back") return <>{t("nav.back")}</>;
  return <>{t(`login.${part}` as const)}</>;
}
