'use client';

import { useState } from 'react';
import { Check, Star, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function PricingSection() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simular envío (aquí conectarías con tu backend/Supabase)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitted(true);
    setIsSubmitting(false);
  };

  const features = [
    'Registro ilimitado de transacciones',
    'Categorización automática con IA',
    'Dashboard completo en tiempo real',
    'Presupuestos y metas personalizables',
    'Alertas y recordatorios inteligentes',
    'Exportación de datos',
    'Soporte prioritario'
  ];

  return (
    <section id="pricing" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Únete al Early Access
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Sé parte de los primeros usuarios en revolucionar su gestión financiera
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            
            {/* Plan Early Access */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-20"></div>
              
              <div className="relative bg-white rounded-2xl p-8 shadow-2xl border border-gray-100">
                {/* Badge */}
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-2 rounded-full text-sm font-bold flex items-center">
                    <Star size={16} className="mr-2" />
                    EARLY ACCESS
                  </div>
                </div>

                <div className="text-center mb-8 mt-4">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Acceso Anticipado
                  </h3>
                  <div className="text-5xl font-bold text-gray-900 mb-2">
                    GRATIS
                  </div>
                  <p className="text-gray-600">
                    Los primeros 3 meses totalmente gratis
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-4 mb-8">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <Check size={12} className="text-white" />
                      </div>
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Bonus */}
                <div className="bg-blue-50 rounded-lg p-4 mb-8">
                  <h4 className="font-semibold text-blue-900 mb-2">
                    🎁 Bonus para Early Adopters:
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Acceso prioritario a nuevas funciones</li>
                    <li>• Sesión 1:1 de configuración gratuita</li>
                    <li>• Descuento vitalicio del 50%</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Formulario Waitlist */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
              {!isSubmitted ? (
                <>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    Únete a la Lista de Espera
                  </h3>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre completo
                      </label>
                      <div className="relative">
                        <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Tu nombre"
                          className="pl-12 h-12 text-lg"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <div className="relative">
                        <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="tu@email.com"
                          className="pl-12 h-12 text-lg"
                          required
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Procesando...
                        </div>
                      ) : (
                        'Reservar mi lugar 🚀'
                      )}
                    </Button>
                  </form>

                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500">
                      Te notificaremos cuando esté listo. Sin spam, prometido 🤝
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={32} className="text-green-600" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    ¡Bienvenido a la lista! 🎉
                  </h3>
                  
                  <p className="text-gray-600 mb-6">
                    Te hemos enviado un email de confirmación. 
                    Serás uno de los primeros en probar FinanzApp.
                  </p>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Siguiente paso:</strong> Síguenos en redes sociales para updates exclusivos
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 text-center">
            <p className="text-gray-500 mb-8">Más de 1,000 personas ya se unieron</p>
            
            <div className="flex justify-center items-center space-x-8 opacity-60">
              <div className="text-2xl font-bold text-gray-400">Startup</div>
              <div className="text-2xl font-bold text-gray-400">Argentina</div>
              <div className="text-2xl font-bold text-gray-400">2024</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 