import React from "react";
import { Button } from "../components/ui/button";
import { HomeIcon } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../components/ui/card";

export default function NotFound() {
  return (
    <main className="flex-1 flex items-start justify-center pt-24 sm:pt-32">
      <div className="w-full max-w-md">
        <Card className="border-2 shadow-lg transform hover:scale-[1.01] transition-transform">
          <CardHeader className="space-y-1">
            <CardTitle className="text-center">
              <span className="text-8xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent animate-pulse duration-5000">
                404
              </span>
            </CardTitle>
            <CardDescription className="text-center text-xl mt-4">
              Houston, we have a problem! 🚀
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            This page has pulled a disappearing act worthy of Houdini! 🎩✨
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/">
              <Button className="gap-2 hover:scale-105 transition-transform">
                <HomeIcon size={16} />
                Beam me up, Scotty!
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
