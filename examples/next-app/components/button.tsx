import type { ButtonHTMLAttributes } from "react";

const variants = {
  primary: "bg-zinc-900 text-white hover:bg-zinc-700",
  ghost: "text-zinc-900 hover:bg-zinc-100",
};

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return (
    <button
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
