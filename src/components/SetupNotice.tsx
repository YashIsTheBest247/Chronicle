import { AlertTriangle } from "lucide-react";

/**
 * Shown when the server reports a configuration problem rather than a bug.
 * A missing DATABASE_URL on first run is expected, not an error state.
 */
export function SetupNotice({ message }: { message: string }) {
  const needsDb = /DATABASE_URL|pgvector|database/i.test(message);
  const needsKey = /GEMINI_API_KEY/i.test(message);

  return (
    <div className="mx-auto max-w-xl py-24">
      <div className="card p-8">
        <span className="grid size-11 place-items-center rounded-full bg-[#B07A1E]/12 text-[#B07A1E]">
          <AlertTriangle size={19} />
        </span>

        <h1 className="mt-5 text-[1.375rem] leading-tight font-semibold">
          Chronicle needs one more thing
        </h1>
        <p className="mt-2.5 text-[1rem] leading-relaxed text-muted text-pretty">
          {message}
        </p>

        <div className="mt-6 space-y-4 border-t border-lineSoft pt-6">
          {needsDb && (
            <Setting
              label="DATABASE_URL"
              body="A Postgres connection string. Supabase and Neon both include pgvector — copy the URI from Project Settings → Database. Chronicle creates its own tables and vector index on first run."
            />
          )}
          {needsKey && (
            <Setting
              label="GEMINI_API_KEY"
              body="A free key from aistudio.google.com/apikey. Used for document understanding, relationship labelling, and embeddings."
            />
          )}
        </div>

        <p className="mt-6 text-[0.875rem] text-faint">
          Put these in <code className="font-mono">.env.local</code>, then
          restart the dev server.
        </p>
      </div>
    </div>
  );
}

function Setting({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="font-mono text-[0.875rem] font-semibold">{label}</p>
      <p className="mt-1 text-[0.875rem] leading-relaxed text-muted text-pretty">
        {body}
      </p>
    </div>
  );
}
