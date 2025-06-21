'use client';

import { MessageCircle, Play, ChevronRight } from 'lucide-react';
import AnimatedWords from './AnimatedWords';
import { Button } from '@/components/ui/button';

export default function HeroSection() {
  const words = ['Gastos', 'Presupuesto', 'Ingresos', 'Inversiones', 'Ahorros'];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-16">
      {/* Elementos de fondo decorativos */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 rounded-full text-blue-700 text-sm font-medium mb-8 animate-fade-in">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            Más de 1,000 usuarios ya controlan sus finanzas
          </div>

          {/* Título principal */}
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Controla tus finanzas con{' '}
            <br className="hidden md:block" />
            <AnimatedWords 
              words={words}
              className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600"
              duration={1500}
            />
            <br />
            directo desde{' '}
            <span className="text-green-600">WhatsApp</span>
          </h1>

          {/* Subtítulo */}
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            La forma más fácil de registrar tus transacciones. 
            Solo envía un mensaje y FinanzApp hace el resto.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button 
              size="lg" 
              className="
                bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700
                text-white px-8 py-4 text-lg font-semibold rounded-xl
                transform hover:scale-105 transition-all duration-200
                shadow-lg hover:shadow-xl
                flex items-center space-x-3
              "
              onClick={() => window.open('https://wa.me/5491234567890?text=Hola, quiero probar FinanzApp', '_blank')}
            >
              <MessageCircle size={24} />
              <span>Probar en WhatsApp</span>
              <ChevronRight size={20} />
            </Button>

            <Button 
              variant="outline" 
              size="lg"
              className="
                border-2 border-gray-300 hover:border-gray-400
                text-gray-700 px-8 py-4 text-lg font-semibold rounded-xl
                transform hover:scale-105 transition-all duration-200
                flex items-center space-x-3
              "
            >
              <Play size={20} />
              <span>Ver Demo</span>
            </Button>
          </div>

          {/* Preview del producto */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-2xl p-1 transform hover:scale-105 transition-all duration-300">
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl p-8">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  
                  {/* Mockup de WhatsApp */}
                  <div className="bg-[#075E54] rounded-xl p-4 text-white">
                    <div className="flex items-center mb-4 pb-2 border-b border-green-700">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-bold">F</span>
                      </div>
                      <span className="font-semibold">FinanzApp</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="bg-[#DCF8C6] text-gray-800 p-3 rounded-lg ml-auto max-w-[80%]">
                        <p className="text-sm">Gasto 450 inversiones hoy</p>
                      </div>
                      
                      <div className="bg-white text-gray-800 p-3 rounded-lg max-w-[85%]">
                        <p className="text-sm font-medium mb-2">📋 Confirma esta operación:</p>
                        <p className="text-sm">💸 <strong>Gasto</strong></p>
                        <p className="text-sm">🏷️ Categoría: Inversiones</p>
                        <p className="text-sm">💵 Importe: $450.000</p>
                        <p className="text-sm">📅 Fecha: 21/06/2025</p>
                        
                        <div className="flex gap-2 mt-3">
                          <button className="bg-green-500 text-white px-4 py-1 rounded text-xs">SI</button>
                          <button className="bg-gray-300 text-gray-700 px-4 py-1 rounded text-xs">NO</button>
                        </div>
                      </div>
                      
                      <div className="bg-white text-gray-800 p-3 rounded-lg max-w-[80%]">
                        <p className="text-sm">✅ ¡Transacción registrada exitosamente!</p>
                      </div>
                    </div>
                  </div>

                  {/* Dashboard preview */}
                  <div className="bg-white rounded-lg p-4 border">
                    <h3 className="font-semibold text-gray-900 mb-4">Dashboard Actualizado</h3>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                        <p className="text-red-600 text-xs font-medium">Gastos</p>
                        <p className="text-red-700 font-bold">$450.000</p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <p className="text-blue-600 text-xs font-medium">Presupuesto</p>
                        <p className="text-blue-700 font-bold">$50.000</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Inversiones</span>
                        <span className="font-medium">$450.000</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-600 h-2 rounded-full" style={{width: '75%'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos CSS personalizados */}
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
      `}</style>
    </section>
  );
} 