import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { DatabaseBackup, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { ADLaM_Display } from "next/font/google";
import bg from "../../public/bg/bg1.jpg";
const adlam = ADLaM_Display({
  subsets: ["latin"],
  display: "swap",
  weight: "400",
});

const Header = () => {
  const { theme, setTheme } = useTheme();

  return (
    <>
      <header
        className={` flex items-center justify-between p-4 text-foreground bg--background ${
          theme === "dark" ? "rainbow-shadow" : "shadow-md"
        }`}
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
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-[1.2rem] w-[1.2rem]" />
          ) : (
            <Moon className="h-[1.2rem] w-[1.2rem]" />
          )}
        </Button>
      </header>
    </>
  );
};

export default Header;
