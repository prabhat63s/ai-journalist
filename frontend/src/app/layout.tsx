import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "AI Journalist",
  description: "Advanced AI Journalism platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${playfair.variable} antialiased bg-background text-foreground font-sans`}
      >
        <AuthProvider>
          <ThemeProvider>
            <div className="h-screen bg-background flex flex-col overflow-hidden">
              <main className="flex-1 flex flex-col overflow-hidden">
                {children}
              </main>
              <Toaster position="top-right" richColors />
            </div>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
