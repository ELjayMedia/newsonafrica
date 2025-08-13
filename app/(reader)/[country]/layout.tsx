import type { ReactNode } from 'react';

export default function CountryLayout({
  params,
  children,
}: {
  params: { country: string };
  children: ReactNode;
}) {
  return (
    <div>
      <nav className="p-4 border-b mb-4">{/* TODO: country-specific nav for {params.country} */}</nav>
      {children}
    </div>
  );
}

