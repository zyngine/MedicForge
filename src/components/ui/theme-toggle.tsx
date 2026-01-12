"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown";

interface ThemeToggleProps {
  variant?: "icon" | "dropdown" | "switch";
  className?: string;
}

export function ThemeToggle({ variant = "dropdown", className }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className={className}
        aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </Button>
    );
  }

  if (variant === "switch") {
    return (
      <button
        onClick={toggleTheme}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          resolvedTheme === "dark" ? "bg-primary" : "bg-muted"
        } ${className}`}
        aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
      >
        <span
          className={`inline-flex h-4 w-4 transform items-center justify-center rounded-full bg-white transition-transform ${
            resolvedTheme === "dark" ? "translate-x-6" : "translate-x-1"
          }`}
        >
          {resolvedTheme === "dark" ? (
            <Moon className="h-3 w-3 text-primary" />
          ) : (
            <Sun className="h-3 w-3 text-yellow-500" />
          )}
        </span>
      </button>
    );
  }

  // Dropdown variant (default)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={className}>
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
          {theme === "light" && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
          {theme === "dark" && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          System
          {theme === "system" && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
