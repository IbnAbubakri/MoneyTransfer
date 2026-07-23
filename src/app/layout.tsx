import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAR to NGN Exchange — AI-Powered Money Transfer",
  description: "Fast, secure, and AI-powered Saudi Riyal to Nigerian Naira exchange platform. Convert SAR to NGN with real-time rates and instant processing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
