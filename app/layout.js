import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import localFont from "next/font/local";

import { ThemeProvider } from "./components/theme-provider";
import HeaderClient from "./components/HeaderClient";

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen min-w-full flex flex-col bg--background gap-4 overflow-hidden">
            <HeaderClient />
            {children}
          </div>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
