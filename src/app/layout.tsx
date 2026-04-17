// src/app/layout.tsx
import type { Metadata } from "next";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Roavana.Kalender – Buchungsmanagement",
  description: "Buchungen von Airbnb, Booking & Traumferienwohnung automatisch synchronisieren. Doppelbuchungen ausschließen.",
  icons: { icon: "https://roavana.de/wp-content/uploads/2025/12/favi-icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
