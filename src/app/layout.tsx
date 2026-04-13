import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { StoreProvider } from "@/store/providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MO:MO STEAMERS",
  description: "Multi-tenant outlet and user management",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <StoreProvider>
          {children}
          <Toaster richColors position="top-right" />
        </StoreProvider>
      </body>
    </html>
  );
}
