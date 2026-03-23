import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  icon?: ReactNode;
  /** Monospace-style label above the title (e.g. telemetry). */
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ icon, eyebrow, title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("page-header fade-up", className)}>
      <div className="page-header__inner">
        <div className="page-header__text">
          {icon ? <div className="page-header__icon">{icon}</div> : null}
          <div className="min-w-0">
            {eyebrow ? <p className="page-header__eyebrow">{eyebrow}</p> : null}
            <h1 className="page-header__title">{title}</h1>
            {subtitle ? <p className="page-header__subtitle">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="page-header__actions">{actions}</div> : null}
      </div>
    </header>
  );
}
