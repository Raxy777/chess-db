"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Moon, Settings, Sun } from "lucide-react";

interface HeaderProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onSettingsClick: () => void; // Added for settings button action
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, onSettingsClick }) => {
  return (
    <header className="p-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-sm z-10">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-2xl font-bold text-primary">
        TheoryDB
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={onSettingsClick}>
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
