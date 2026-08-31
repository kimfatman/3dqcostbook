import { type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border-dashed p-6 text-center text-balance md:p-12",
        className
      )}
      {...props}
    />
  );
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn(
        "flex max-w-sm flex-col items-center gap-2 text-center",
        className
      )}
      {...props}
    />
  );
}

const emptyMediaVariants = cva(
  "flex shrink-0 items-center justify-center mb-2 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-6",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function EmptyMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  );
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-title"
      className={cn("text-lg font-medium tracking-tight", className)}
      {...props}
    />
  );
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        "text-muted-foreground [&>a:hover]:text-primary text-sm/relaxed [&>a]:underline [&>a]:underline-offset-4",
        className
      )}
      {...props}
    />
  );
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        "flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance",
        className
      )}
      {...props}
    />
  );
}


/** 三段式空态：浅灰卡片 + 图标 + 标题/描述 + 可选行动按钮。 */
function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl bg-[#f9fafb] px-6 py-6 text-center",
        className
      )}
    >
      {icon ? <EmptyMedia variant="icon">{icon}</EmptyMedia> : null}
      <p data-slot="empty-state-title" className="text-sm font-medium text-[#374151]">{title}</p>
      {description ? (
        <p data-slot="empty-state-description" className="max-w-sm text-xs/relaxed text-[#6b7280]">{description}</p>
      ) : null}
      {action ? (
        <button type="button" data-slot="empty-state-action" onClick={action.onClick} className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-[#087ff5] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#086fe0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ff5]">
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

export {
  Empty,
  EmptyHeader,
  EmptyState,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
};
