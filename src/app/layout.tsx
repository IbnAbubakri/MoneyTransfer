import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAR to NGN Exchange — AI-Powered Money Transfer",
  description: "Fast, secure, and AI-powered Saudi Riyal to Nigerian Naira exchange platform. Convert SAR to NGN with real-time rates and instant processing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:outline-none"
          >
            Skip to content
          </a>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
