import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gastrowheel — Build Delicious Dishes",
  description:
    "An interactive cooking companion. Pick ingredients around the flavor wheel and compose balanced, flavorful dishes one component at a time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
