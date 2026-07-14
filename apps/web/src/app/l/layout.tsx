import type { ReactNode } from "react";

/**
 * Public product landings — isolated from Colony OS dashboard chrome.
 * Body dark-theme rules are neutralized via .landing-shell in globals.css.
 */
export default function PublicLandingLayout({ children }: { children: ReactNode }) {
  return <div className="landing-shell">{children}</div>;
}
