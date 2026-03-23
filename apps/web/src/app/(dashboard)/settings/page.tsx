"use client";

import { useState } from "react";
import { CheckCircle, Copy, Eye, EyeOff } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

interface SettingField {
  key: string;
  label: string;
  placeholder: string;
  description: string;
  envVar: string;
  secret: boolean;
}

const SETTINGS: { section: string; fields: SettingField[] }[] = [
  {
    section: "AI / Queen Bee",
    fields: [
      {
        key: "openai_key",
        label: "OpenAI API Key",
        placeholder: "sk-...",
        description: "Powers Queen Bee, Scout analysis, Builder copy, and Closer outreach",
        envVar: "OPENAI_API_KEY",
        secret: true,
      },
    ],
  },
  {
    section: "Scout Bee",
    fields: [
      {
        key: "firecrawl_key",
        label: "Firecrawl API Key",
        placeholder: "fc-...",
        description: "Web scraping for market research and demand signal detection",
        envVar: "FIRECRAWL_API_KEY",
        secret: true,
      },
    ],
  },
  {
    section: "Builder / Treasurer Bee",
    fields: [
      {
        key: "stripe_secret",
        label: "Stripe Secret Key",
        placeholder: "sk_live_...",
        description: "Creates products, prices, and payment links autonomously",
        envVar: "STRIPE_SECRET_KEY",
        secret: true,
      },
      {
        key: "stripe_webhook",
        label: "Stripe Webhook Secret",
        placeholder: "whsec_...",
        description: "Validates incoming Stripe webhook events for revenue tracking",
        envVar: "STRIPE_WEBHOOK_SECRET",
        secret: true,
      },
    ],
  },
  {
    section: "HITL / Telegram",
    fields: [
      {
        key: "telegram_token",
        label: "Telegram Bot Token",
        placeholder: "123456:ABC-...",
        description: "The bot that sends you approval requests and status updates",
        envVar: "TELEGRAM_BOT_TOKEN",
        secret: true,
      },
      {
        key: "telegram_chat_id",
        label: "Admin Chat ID",
        placeholder: "123456789",
        description: "Your personal Telegram chat ID — only you can approve/veto actions",
        envVar: "TELEGRAM_ADMIN_CHAT_ID",
        secret: false,
      },
    ],
  },
  {
    section: "Database",
    fields: [
      {
        key: "supabase_url",
        label: "Supabase URL",
        placeholder: "https://xxx.supabase.co",
        description: "Supabase project URL for all hive data storage",
        envVar: "NEXT_PUBLIC_SUPABASE_URL",
        secret: false,
      },
      {
        key: "supabase_anon",
        label: "Supabase Anon Key",
        placeholder: "eyJ...",
        description: "Public anon key for client-side Supabase operations",
        envVar: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        secret: true,
      },
    ],
  },
];

export default function SettingsPage() {
  const [copied, setCopied] = useState<string | null>(null);

  async function copyEnvTemplate() {
    const template = SETTINGS.flatMap((s) => s.fields.map((f) => `${f.envVar}=`)).join("\n");
    await navigator.clipboard.writeText(template);
    setCopied("template");
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        icon={<span aria-hidden>⚙️</span>}
        title="Settings"
        subtitle="API keys, Telegram HITL, Supabase, and integrations — mirror what you set in .env.local."
        actions={
          <button
            type="button"
            onClick={copyEnvTemplate}
            className="btn-ghost gap-2 text-sm font-semibold"
          >
            {copied === "template" ? (
              <CheckCircle className="h-4 w-4" style={{ color: "var(--status-green)" }} />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            Copy .env template
          </button>
        }
      />

      {/* ── Env notice ──────────────────────────────── */}
      <div
        className="rounded-xl p-4"
        style={{ background: "var(--status-amber-bg)", border: "1px solid rgba(217,119,6,0.2)" }}
      >
        <p className="text-sm font-semibold mb-1" style={{ color: "var(--status-amber)" }}>
          Configure via .env.local
        </p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          All secrets are configured via environment variables in{" "}
          <code
            className="px-1.5 py-0.5 rounded text-xs"
            style={{
              background: "rgba(0,0,0,0.06)",
              fontFamily: "monospace",
              color: "var(--status-amber)",
            }}
          >
            apps/web/.env.local
          </code>
          . Never commit secrets to version control.
        </p>
      </div>

      {/* ── Settings sections ───────────────────────── */}
      <div className="space-y-4">
        {SETTINGS.map((section) => (
          <div key={section.section} className="card overflow-hidden">
            <div
              className="px-5 py-3.5"
              style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-muted)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {section.section}
              </p>
            </div>
            <div>
              {section.fields.map((field, i) => (
                <SettingRow
                  key={field.key}
                  field={field}
                  isLast={i === section.fields.length - 1}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Telegram HITL guide ─────────────────────── */}
      <div className="card p-6">
        <p className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Telegram HITL Setup
        </p>
        <ol className="space-y-3">
          {[
            "Message @BotFather on Telegram → /newbot → copy the token",
            "Message @userinfobot to get your personal chat ID",
            "Add both to .env.local as TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID",
            "Set webhook: POST https://api.telegram.org/bot<TOKEN>/setWebhook with url: https://yourdomain.com/api/telegram-webhook",
            "Send /start to your bot — CyberHound will respond",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                style={{
                  background: "var(--bg-muted)",
                  border: "1px solid var(--border-strong)",
                  color: "var(--text-secondary)",
                }}
              >
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function SettingRow({ field, isLast }: { field: SettingField; isLast: boolean }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyEnvVar() {
    await navigator.clipboard.writeText(`${field.envVar}=`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className="px-5 py-4 flex items-start gap-5"
      style={{ borderBottom: isLast ? "none" : "1px solid var(--border)" }}
    >
      {/* Label + description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {field.label}
          </p>
          <button
            onClick={copyEnvVar}
            className="opacity-40 hover:opacity-80 transition-opacity"
            title="Copy env var name"
          >
            {copied ? (
              <CheckCircle className="w-3.5 h-3.5" style={{ color: "var(--status-green)" }} />
            ) : (
              <Copy className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
            )}
          </button>
        </div>
        <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
          {field.description}
        </p>
        <code className="text-xs" style={{ color: "var(--status-amber)", fontFamily: "monospace" }}>
          {field.envVar}
        </code>
      </div>

      {/* Value display */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs shrink-0"
        style={{
          background: "var(--bg-muted)",
          border: "1px solid var(--border)",
          color: "var(--text-muted)",
          fontFamily: "monospace",
        }}
      >
        <span>{show ? field.placeholder : "••••••••"}</span>
        {field.secret && (
          <button
            onClick={() => setShow(!show)}
            className="opacity-60 hover:opacity-100 transition-opacity"
          >
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}
