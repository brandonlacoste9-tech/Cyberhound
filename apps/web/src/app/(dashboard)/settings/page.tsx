"use client";

import { useState } from "react";
import { Settings, Eye, EyeOff, CheckCircle, Copy } from "lucide-react";

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
    const template = SETTINGS.flatMap((s) =>
      s.fields.map((f) => `${f.envVar}=`)
    ).join("\n");

    await navigator.clipboard.writeText(template);
    setCopied("template");
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Settings
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Configure CyberHound — API keys, Telegram HITL, and integrations
          </p>
        </div>
        <button
          onClick={copyEnvTemplate}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--text-secondary)",
          }}
        >
          {copied === "template" ? (
            <CheckCircle className="w-3.5 h-3.5" style={{ color: "var(--status-closing)" }} />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          Copy .env template
        </button>
      </div>

      {/* Env file notice */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "rgba(251,191,36,0.05)",
          border: "1px solid rgba(251,191,36,0.15)",
        }}
      >
        <p className="text-xs font-medium mb-1" style={{ color: "var(--amber-400)" }}>
          ⚠️ Configure via .env.local
        </p>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          All secrets are configured via environment variables in{" "}
          <code
            className="px-1.5 py-0.5 rounded text-[10px]"
            style={{
              background: "rgba(255,255,255,0.08)",
              fontFamily: "var(--font-geist-mono)",
              color: "var(--amber-400)",
            }}
          >
            apps/web/.env.local
          </code>
          . Never commit secrets to version control. Use the template above to scaffold your env file.
        </p>
      </div>

      {/* Settings sections */}
      <div className="space-y-6">
        {SETTINGS.map((section) => (
          <div key={section.section} className="glass rounded-xl overflow-hidden">
            <div
              className="px-4 py-3 border-b"
              style={{ borderColor: "var(--glass-border)" }}
            >
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {section.section}
              </p>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--glass-border)" }}>
              {section.fields.map((field) => (
                <SettingRow key={field.key} field={field} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Telegram setup guide */}
      <div className="glass rounded-xl p-5 space-y-3">
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          🤖 Telegram HITL Setup
        </p>
        <ol className="space-y-2">
          {[
            "Message @BotFather on Telegram → /newbot → copy the token",
            "Message @userinfobot to get your personal chat ID",
            "Add both to .env.local as TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID",
            `Set webhook: POST https://api.telegram.org/bot<TOKEN>/setWebhook with url: https://yourdomain.com/api/telegram-webhook`,
            "Send /start to your bot — CyberHound will respond",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs" style={{ color: "var(--text-secondary)" }}>
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{
                  background: "rgba(251,191,36,0.15)",
                  border: "1px solid rgba(251,191,36,0.3)",
                  color: "var(--amber-400)",
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

function SettingRow({ field }: { field: SettingField }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyEnvVar() {
    await navigator.clipboard.writeText(`${field.envVar}=`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="px-4 py-3 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
            {field.label}
          </p>
          <button onClick={copyEnvVar} className="opacity-50 hover:opacity-100 transition-opacity">
            {copied ? (
              <CheckCircle className="w-3 h-3" style={{ color: "var(--status-closing)" }} />
            ) : (
              <Copy className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
            )}
          </button>
        </div>
        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
          {field.description}
        </p>
        <code
          className="text-[10px] mt-1 block"
          style={{ color: "var(--amber-400)", fontFamily: "var(--font-geist-mono)" }}
        >
          {field.envVar}
        </code>
      </div>

      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs shrink-0"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "var(--text-muted)",
          fontFamily: "var(--font-geist-mono)",
        }}
      >
        <span>{show ? field.placeholder : "••••••••"}</span>
        {field.secret && (
          <button
            onClick={() => setShow(!show)}
            className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
          >
            {show ? (
              <EyeOff className="w-3 h-3" />
            ) : (
              <Eye className="w-3 h-3" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
