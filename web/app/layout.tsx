import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Data Centers Near Me | Footprint",
  description: "Find nearby data centers and explore their environmental and public health footprint.",
  icons: {
    icon: [{url: "/favicon-32.png?v=six-toes-v2-20261018", sizes: "32x32", type: "image/png"}, {url: "/favicon.svg?v=six-toes-v2-20261018", type: "image/svg+xml"}],
    shortcut: "/favicon.ico?v=six-toes-v2-20261018",
    apple: "/apple-touch-icon.png?v=six-toes-v2-20261018",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
