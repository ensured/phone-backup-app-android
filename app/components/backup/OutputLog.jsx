"use client";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowBigUp, ArrowBigDown, Copy } from "lucide-react";

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    return false;
  }
};

export default function OutputLog({
  output,
  progress,
  currentFolder,
  backupStarted,
  scrollPercentage,
  onScroll,
  hoveredLine,
  setHoveredLine,
  mousePosition,
  setMousePosition,
  onCopyLine,
  onCopyAllLogs,
  outputRef,
}) {
  return (
    <div className="mt-2 sm:w-[92%] w-[90%] lg:max-w-[64rem] mx-auto bg-secondary/30 rounded-md relative border border-border">
      <div className="relative top-0 left-0 w-full px-6 py-2 shadow-md ">
        <div className="w-full flex items-center justify-between text-muted-foreground">
          <div className="flex-grow text-center">
            <span className="text-lg font-semibold">
              {progress.completed} / {progress.total} files{" "}
              <b className="text-primary">{progress.percentage}%</b>
            </span>
          </div>
          <span className="px-3 py-1 bg-secondary/50 text-xs flex items-center gap-0.5">
            {currentFolder.replace("/storage/emulated/0", "")}
          </span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2 mt-2">
          <div
            className="bg-primary/90 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress.percentage}%` }}
          ></div>
        </div>
      </div>

      <div
        ref={outputRef}
        onScroll={onScroll}
        className={`${backupStarted ? "mt-[9px]" : ""} h-[18rem] max-w-[64rem] w-full overflow-auto relative`}
      >
        {output
          .trim()
          .split("\n")
          .map((line, index) => (
            <div
              key={index}
              className={`log-message ${index % 2 === 0 ? "even" : "odd"} relative select-text hover:bg-secondary/50`}
              onMouseEnter={(e) => {
                setHoveredLine(line);
                setMousePosition({
                  x: e.clientX,
                  y: e.clientY - 25,
                });
              }}
              onMouseMove={(e) => {
                setMousePosition({
                  x: e.clientX,
                  y: e.clientY - 25,
                });
              }}
              onMouseLeave={() => {
                setHoveredLine(null);
              }}
              onClick={() => onCopyLine(line)}
            >
              <span className="flex flex-wrap break-all p-0.5">{line}</span>
              {hoveredLine === line && (
                <div
                  className="fixed z-50 bg-popover text-popover-foreground px-2 py-1 text-xs shadow-md pointer-events-none"
                  style={{
                    left: `${mousePosition.x}px`,
                    top: `${mousePosition.y}px`,
                    transform: "translate(-50%, -100%)",
                  }}
                >
                  Click to copy
                </div>
              )}
            </div>
          ))}
      </div>

      <div className="sticky bottom-0 w-full flex justify-end gap-1 p-2 bg-background/80 backdrop-blur-sm rounded-md">
        <div className="relative">
          <Button
            variant="secondary"
            size="icon"
            className={`absolute right-0 transition-opacity duration-200 ${
              scrollPercentage > 50 ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            onClick={() => {
              outputRef.current?.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            }}
          >
            <ArrowBigUp className="size-8" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className={`absolute right-0 transition-opacity duration-200 ${
              scrollPercentage <= 50 && outputRef.current?.scrollHeight > outputRef.current?.clientHeight
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
            onClick={() => {
              outputRef.current?.scrollTo({
                top: outputRef.current.scrollHeight,
                behavior: "smooth",
              });
            }}
          >
            <ArrowBigDown className="size-8" />
          </Button>
        </div>
        <Button variant="secondary" className="flex items-center gap-2" onClick={onCopyAllLogs}>
          <Copy className="size-5" />
          Copy Logs
        </Button>
      </div>
    </div>
  );
}
