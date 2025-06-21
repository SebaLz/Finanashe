'use client';

import { Zap, Brain, BarChart3, Bell } from 'lucide-react';

const benefits = [
  {
    icon: Zap,
    title: 'Registro Instantáneo',
    description: 'Escribe "Gasto 500 supermercado" y listo. Sin formularios complicados.',
    color: 'from-yellow-400 to-orange-500'
  },
  {
    icon: Brain,
    title: 'IA que Entiende',
    description: 'Nuestro bot interpreta tu lenguaje natural y categoriza automáticamente.',
    color: 'from-purple-400 to-pink-500'
  },
  {
    icon: BarChart3,
    title: 'Dashboard Completo',
    description: 'Visualiza tus finanzas en tiempo real desde cualquier dispositivo.',
    color: 'from-blue-400 to-cyan-500'
  },
  {
    icon: Bell,
    title: 'Alertas Inteligentes',
    description: 'Recordatorios de pagos y alertas cuando excedes tu presupuesto.',
    color: 'from-green-400 to-emerald-500'
  }
];

export default function BenefitsSection() {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            ¿Por qué elegir FinanzApp?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Simplificamos la gestión financiera para que puedas enfocarte en lo que realmente importa: 
            tus objetivos financieros.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="group relative bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
              style={{
                animationDelay: `${index * 150}ms`
              }}
            >
              {/* Gradiente de fondo que aparece en hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${benefit.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl`}></div>
              
              {/* Icono */}
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${benefit.color} flex items-center justify-center mb-6 transform group-hover:scale-110 transition-transform duration-300`}>
                <benefit.icon size={32} className="text-white" />
              </div>

              {/* Contenido */}
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {benefit.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {benefit.description}
              </p>

              {/* Elemento decorativo */}
              <div className="absolute top-4 right-4 w-2 h-2 bg-gray-200 rounded-full group-hover:bg-blue-400 transition-colors duration-300"></div>
            </div>
          ))}
        </div>

        {/* Estadísticas */}
        <div className="mt-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">+1,000</div>
              <div className="text-blue-100">Usuarios activos</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">98%</div>
              <div className="text-blue-100">Satisfacción</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">15 seg</div>
              <div className="text-blue-100">Tiempo promedio de registro</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 