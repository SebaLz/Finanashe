"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      <ThemeScript />
      {children}
    </NextThemesProvider>
  );
}

// Script para evitar parpadeo al cargar la página
function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              // Primero intenta usar localStorage para obtener el tema
              const storedTheme = localStorage.getItem('theme');
              
              if (storedTheme === 'dark') {
                document.documentElement.classList.add('dark');
              } else if (storedTheme === 'light') {
                document.documentElement.classList.remove('dark');
              } else {
                // Si no hay tema guardado o es "system", usar la preferencia del sistema
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (prefersDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              }
            } catch (e) {
              console.error('Error aplicando tema:', e);
            }
          })();
        `,
      }}
    />
  );
} 