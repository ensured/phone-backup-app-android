"use client";

import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export function DeviceNotConnected() {
  return (
    <div className="flex items-center justify-center">
      <Card className="w-[26.25rem] h-[257px] md:h-auto border-border container">
        <CardContent className="flex flex-col items-center text-center p-6 space-y-4">
          <AlertCircle className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-red-500 dark:text-red-400" />
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold">
            Device Not Connected
          </h2>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground">
            Please make sure your device is connected to your computer via USB
            and enable USB debugging.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
