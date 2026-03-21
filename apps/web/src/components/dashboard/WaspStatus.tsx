"use client";

import { useEffect, useState, useCallback } from "react";
import { Zap, Wifi, WifiOff, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface WaspState {
  status: "online" | "offline" | "degraded" | "checking";
  latency: number;
  port: string;
  models: string[];
  message: string;
}

export default function WaspStatus() {
  const [wasp, setWasp] = useState<WaspState>({
    status: "checking",
    latency: 0,
    port: "18790",
    models: [],
    message: "Connecting to The Wasp...",
  });
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const checkWasp = useCallback(async () => {
    setRefreshing(true);
    setWasp((prev) => ({ ...prev, status: "checking" }));
    try {
      const res = await fetch("/api/wasp");
      const data = await res.json();
      setWasp({ ...data, status: data.status });
    } catch {
      setWasp({
        status: "offline",
        latency: 0,
        port: "18790",
        models: [],
        message: "Cannot reach Wasp API",
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    checkWasp();
    const interval = setInterval(checkWasp, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [checkWasp]);

  const statusColor =
    wasp.status === "online"
      ? "#22c55e"
      : wasp.status === "degraded"
      ? "#f59e0b"
      : wasp.status === "checking"
      ? "#60a5fa"
      : "#ef4444";

  const statusBg =
    wasp.status === "online"
      ? "rgba(34,197,94,0.08)"
      : wasp.status === "degraded"
      ? "rgba(245,158,11,0.08)"
      : wasp.status === "checking"
      ? "rgba(96,165,250,0.08)"
      : "rgba(239,68,68,0.08)";

  const statusBorder =
    wasp.status === "online"
      ? "rgba(34,197,94,0.2)"
      : wasp.status === "degraded"
      ? "rgba(245,158,11,0.2)"
      : wasp.status === "checking"
      ? "rgba(96,165,250,0.2)"
      : "rgba(239,68,68,0.2)";

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(15,15,20,0.8)",
        border: `1px solid ${statusBorder}`,
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Header row */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {/* Wasp icon with pulse */}
          <div className="relative">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: statusBg, border: `1px solid ${statusBorder}` }}
            >
              <Zap className="w-4 h-4" style={{ color: statusColor }} />
            </div>
            {wasp.status === "online" && (
              <span
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full animate-pulse"
                style={{ background: statusColor }}
              />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: "#f5f5f5" }}>
                The Wasp
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide"
                style={{ background: statusBg, color: statusColor }}
              >
                {wasp.status === "checking" ? "..." : wasp.status}
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "#71717a" }}>
              OpenClaw · port {wasp.port}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {wasp.status === "online" && (
            <span className="text-xs font-mono" style={{ color: "#52525b" }}>
              {wasp.latency}ms
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              checkWasp();
            }}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "#52525b" }}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
          {expanded ? (
            <ChevronUp className="w-4 h-4" style={{ color: "#52525b" }} />
          ) : (
            <ChevronDown className="w-4 h-4" style={{ color: "#52525b" }} />
          )}
        </div>
      </div>

      {/* Status message */}
      <div
        className="px-5 pb-3 flex items-center gap-2"
        style={{ borderTop: `1px solid rgba(255,255,255,0.04)` }}
      >
        {wasp.status === "online" ? (
          <Wifi className="w-3.5 h-3.5 shrink-0" style={{ color: statusColor }} />
        ) : (
          <WifiOff className="w-3.5 h-3.5 shrink-0" style={{ color: statusColor }} />
        )}
        <p className="text-xs pt-3" style={{ color: "#71717a" }}>
          {wasp.message}
        </p>
      </div>

      {/* Expanded: models list */}
      {expanded && wasp.models.length > 0 && (
        <div
          className="px-5 pb-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 pt-3" style={{ color: "#52525b" }}>
            Available Models
          </p>
          <div className="flex flex-wrap gap-2">
            {wasp.models.map((m) => (
              <span
                key={m}
                className="text-xs px-2.5 py-1 rounded-lg font-mono"
                style={{
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.15)",
                  color: "#f59e0b",
                }}
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Expanded: offline help */}
      {expanded && wasp.status === "offline" && (
        <div
          className="px-5 pb-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 pt-3" style={{ color: "#52525b" }}>
            Start The Wasp
          </p>
          <code
            className="block text-xs p-3 rounded-lg font-mono"
            style={{
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#a1a1aa",
            }}
          >
            openclaw onboard --install-daemon
          </code>
          <p className="text-xs mt-2" style={{ color: "#52525b" }}>
            Falling back to DeepSeek cloud API
          </p>
        </div>
      )}
    </div>
  );
}
