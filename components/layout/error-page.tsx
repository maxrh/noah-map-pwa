"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { TypographyH1, TypographyP } from "@/components/ui/typography";
import { buttonVariants } from "@/components/ui/button";

interface ErrorPageAction {
  label: string;
  /** Render as a Next.js Link when set. */
  href?: string;
  /** Render as a button when set. Ignored if `href` is provided. */
  onClick?: () => void;
  variant?: "default" | "secondary";
  /** Optional leading icon (e.g. a lucide icon element). */
  icon?: ReactNode;
}

interface ErrorPageProps {
  title: string;
  description: string;
  actions?: ErrorPageAction[];
  children?: ReactNode;
}

/**
 * Shared layout for error / not-found / empty-state pages so they all use
 * identical width, padding and typography.
 */
export function ErrorPage({ title, description, actions, children }: ErrorPageProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6 pb-16 md:p-12 md:pb-24 flex items-center justify-center">
      <div className="max-w-xl w-full mx-auto text-center">
        <TypographyH1 className="mb-3">{title}</TypographyH1>
        <TypographyP className="text-muted-foreground">{description}</TypographyP>
        {actions && actions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-6 justify-center">
            {actions.map((action, i) => {
              const variant = action.variant ?? (i === 0 ? "default" : "secondary");
              const className = buttonVariants({ variant, size: "lg" });
              if (action.href) {
                return (
                  <Link key={action.label} href={action.href} className={className}>
                    {action.icon}
                    {action.label}
                  </Link>
                );
              }
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className={className}
                >
                  {action.icon}
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
