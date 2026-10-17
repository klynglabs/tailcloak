import type { ButtonHTMLAttributes } from "react";

const variants = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-500",
  ghost: "bg-transparent text-indigo-600 hover:bg-indigo-50",
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
        "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
