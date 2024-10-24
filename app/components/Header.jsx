"use client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DatabaseBackup, Loader2, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { ADLaM_Display } from "next/font/google";

const adlam = ADLaM_Display({
  subsets: ["latin"],
  display: "swap",
  weight: "400",
});

const Header = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure the component only renders after mounting to prevent theme flicker
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Show a loading state or a non-themed static header while mounting
    return (
      <header className="flex items-center justify-between p-4 text-foreground bg--background shadow-md shadow-border">
        <h1
          className={cn(
            adlam.className,
            "text-2xl flex flex-row items-center select-none"
          )}
        >
          <DatabaseBackup className="mr-3 size-6 text-purple-700/90 dark:text-purple-700/80" />{" "}
          Backup Buddy
        </h1>
        <Button variant="outline" size="icon">
          <Loader2 className="h-[1.2rem] w-[1.2rem] animate-spin" />
        </Button>
      </header>
    );
  }

  return (
    <header
      className={`flex items-center justify-between p-4 text-foreground bg--background shadow-md shadow-border`}
    >
      <h1
        className={cn(
          adlam.className,
          "text-2xl flex flex-row items-center select-none"
        )}
      >
        <DatabaseBackup className="mr-3 size-6 text-purple-700/90 dark:text-purple-700/80" />{" "}
        Backup Buddy
      </h1>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        aria-label="Toggle theme"
      >
        {resolvedTheme === "dark" ? (
          <Sun className="h-[1.2rem] w-[1.2rem]" />
        ) : (
          <Moon className="h-[1.2rem] w-[1.2rem]" />
        )}
      </Button>
    </header>
  );
};

export default Header;
