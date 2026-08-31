type PageHeadingProps = {
  title: string;
  description?: string;
  aside?: React.ReactNode;
  divider?: boolean;
};

export function PageHeading({ title, description, aside, divider = true }: PageHeadingProps) {
  return <header className={`flex flex-col gap-5 pb-7 sm:flex-row sm:items-end sm:justify-between ${divider ? "border-b border-line" : ""}`}>
    <div><h1 className="text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-4xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">{description}</p>}</div>
    {aside}
  </header>;
}
