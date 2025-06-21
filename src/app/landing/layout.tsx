import { ReactNode } from 'react';
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/providers/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export default function LandingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className={`${inter.className} min-h-screen`}>
      <ThemeProvider 
        attribute="class" 
        defaultTheme="light" 
        enableSystem={false}
        disableTransitionOnChange
      >
        {/* Header público */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="text-xl font-bold text-gray-900">FinanzApp</span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
                Funciones
              </a>
              <a href="#demo" className="text-gray-600 hover:text-gray-900 transition-colors">
                Demo
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                Precios
              </a>
            </nav>
            
            <div className="flex items-center space-x-4">
              <a 
                href="/login" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Iniciar Sesión
              </a>
              <a 
                href="/registro" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Registrarse
              </a>
            </div>
          </div>
        </header>
        
        {/* Contenido principal */}
        <main className="pt-16">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">F</span>
                  </div>
                  <span className="text-xl font-bold">FinanzApp</span>
                </div>
                <p className="text-gray-400">
                  La forma más fácil de controlar tus finanzas personales desde WhatsApp.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4">Producto</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#features" className="hover:text-white transition-colors">Funciones</a></li>
                  <li><a href="#demo" className="hover:text-white transition-colors">Demo</a></li>
                  <li><a href="#pricing" className="hover:text-white transition-colors">Precios</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4">Soporte</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">Ayuda</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Contacto</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4">Legal</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">Privacidad</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Términos</a></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2024 FinanzApp. Todos los derechos reservados.</p>
            </div>
          </div>
        </footer>
      </ThemeProvider>
    </div>
  );
} 