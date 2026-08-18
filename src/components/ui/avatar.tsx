const sizes = { sm: "size-9 text-xs", md: "size-11 text-sm", lg: "size-16 text-lg" };

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "S";
}

export function Avatar({ className = "", displayName, size = "md" }: {
  avatarPath?: unknown;
  className?: string;
  displayName: string;
  size?: keyof typeof sizes;
}) {
  return <span aria-hidden="true" className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-sky-soft font-semibold text-ink ${sizes[size]} ${className}`}>
    {initials(displayName)}
  </span>;
}
