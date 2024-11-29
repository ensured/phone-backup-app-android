import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "./components/theme-provider";
import Header from "./components/Header";
import "./globals.css";

export const metadata = {
  title: "Backup Buddy",
  description: "Backup and manage files on your phone.",
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
            <Header />
            {children}
          </div>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
