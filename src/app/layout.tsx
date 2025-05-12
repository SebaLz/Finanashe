import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/hooks/useUser";
import { ThemeProvider } from "@/providers/theme-provider";
import { ToastProvider } from "@/components/ui/use-toast";
import AppShell from '@/components/layout/AppShell';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Finanzapp - Gestión de Finanzas Personales",
  description: "Aplicación para gestionar tus finanzas personales en Argentina",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <UserProvider>
          <ThemeProvider 
            attribute="class" 
            defaultTheme="system" 
            enableSystem 
            disableTransitionOnChange
          >
            <ToastProvider>
              <AppShell>
                {children}
              </AppShell>
            </ToastProvider>
          </ThemeProvider>
        </UserProvider>
      </body>
    </html>
  );
}
