import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ className = "", type = "button", ...props }: ButtonProps) {
  return <button className={`inline-flex min-h-12 items-center justify-center rounded-field bg-coral px-5 text-sm font-semibold text-white transition duration-200 ease-out hover:bg-coral-dark active:translate-y-px disabled:cursor-not-allowed disabled:bg-line disabled:text-muted ${className}`} type={type} {...props} />;
}
