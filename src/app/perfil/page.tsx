"use client";

import { useEffect, useState } from 'react';
import { getUserProfile, updateUserProfile, createUserProfile } from '@/services/auth';
import { getTransactions } from '@/services/transactions';
import { getGoals } from '@/services/goals';
import { getCategories } from '@/services/categories';
import { useUser } from '@/hooks/useUser';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Mail, 
  Smartphone, 
  Calendar, 
  MapPin, 
  DollarSign,
  Settings,
  BarChart3,
  Bell,
  MessageCircle,
  Edit3,
  Globe,
  Target,
  TrendingUp,
  Shield,
  Palette
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  whatsapp?: string;
  created_at: string;
  country?: string;
  occupation?: string;
  birth_date?: string;
  preferred_currency?: string;
  notification_preferences?: {
    daily_summary: boolean;
    budget_alerts: boolean;
    goal_reminders: boolean;
    transaction_alerts: boolean;
  };
}

interface UserStats {
  totalTransactions: number;
  totalAmount: number;
  completedGoals: number;
  memberSince: string;
  favoriteCategory: string;
  whatsappMessages: number;
}

export default function PerfilPage() {
  const { user } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (user?.id) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Cargar perfil
      const userProfile = await getUserProfile(user.id);
      if (userProfile) {
        setProfile(userProfile);
      } else {
        // Crear perfil básico si no existe
        const newProfile = {
          id: user.id,
          email: user.email || '',
          created_at: new Date().toISOString(),
          preferred_currency: 'ARS',
          notification_preferences: {
            daily_summary: true,
            budget_alerts: true,
            goal_reminders: true,
            transaction_alerts: false
          }
        };
        await createUserProfile(user.id, user.email || '');
        setProfile(newProfile);
      }

      // Cargar estadísticas
      await loadUserStats();
    } catch (error) {
      console.error('Error cargando datos del usuario:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del perfil"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    if (!user?.id) return;

    try {
      const [transactions, goals, categories] = await Promise.all([
        getTransactions(user.id),
        getGoals(user.id),
        getCategories(user.id)
      ]);

      // Calcular estadísticas
      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
      const completedGoals = goals.filter(g => g.current_amount >= g.target_amount).length;
      
      // Encontrar categoría más usada
      const categoryCount: Record<string, number> = {};
      transactions.forEach(t => {
        const category = categories.find(c => c.id === t.category_id);
        if (category) {
          categoryCount[category.name] = (categoryCount[category.name] || 0) + 1;
        }
      });
      
      const favoriteCategory = Object.entries(categoryCount)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Sin datos';

      setStats({
        totalTransactions: transactions.length,
        totalAmount,
        completedGoals,
        memberSince: profile?.created_at || new Date().toISOString(),
        favoriteCategory,
        whatsappMessages: 0 // Placeholder - se puede implementar después
      });
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const handleEdit = (section: string) => {
    setEditingSection(section);
    setFormData({ ...profile });
  };

  const handleSave = async () => {
    if (!user?.id || !formData) return;
    
    setSaving(true);
    try {
      await updateUserProfile(user.id, formData);
      setProfile({ ...profile, ...formData });
      setEditingSection(null);
      toast({
        title: "¡Guardado!",
        description: "Los cambios se guardaron correctamente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingSection(null);
    setFormData({});
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: profile?.preferred_currency || 'ARS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <User className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <h2 className="text-lg font-semibold mb-2">Perfil no encontrado</h2>
            <p className="text-sm text-gray-600 mb-3">Hubo un problema al cargar tu perfil</p>
            <Button onClick={loadUserData} size="sm">Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Mi Perfil</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Gestiona tu información y preferencias de cuenta
        </p>
      </div>

      {/* Resumen Rápido - Cards superiores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="text-center">
          <CardContent className="p-3">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <p className="text-lg font-bold text-blue-600">
              {stats?.totalTransactions || 0}
            </p>
            <p className="text-xs text-gray-600">Transacciones</p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-3">
            <Target className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <p className="text-lg font-bold text-green-600">
              {stats?.completedGoals || 0}
            </p>
            <p className="text-xs text-gray-600">Objetivos</p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-3">
            <Calendar className="h-6 w-6 mx-auto mb-2 text-purple-600" />
            <p className="text-sm font-bold text-purple-600">
              {stats?.memberSince ? format(new Date(stats.memberSince), "MMM yyyy", { locale: es }) : 'N/A'}
            </p>
            <p className="text-xs text-gray-600">Miembro desde</p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-3">
            <MessageCircle className="h-6 w-6 mx-auto mb-2 text-orange-600" />
            <p className="text-lg font-bold text-orange-600">
              {profile.whatsapp ? '✓' : '—'}
            </p>
            <p className="text-xs text-gray-600">WhatsApp</p>
          </CardContent>
        </Card>
      </div>

      {/* Navegación por Pestañas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-1 text-xs">
            <User className="h-3 w-3" />
            General
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-1 text-xs">
            <MessageCircle className="h-3 w-3" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="finanzas" className="flex items-center gap-1 text-xs">
            <DollarSign className="h-3 w-3" />
            Finanzas
          </TabsTrigger>
          <TabsTrigger value="estadisticas" className="flex items-center gap-1 text-xs">
            <BarChart3 className="h-3 w-3" />
            Stats
          </TabsTrigger>
        </TabsList>

        {/* Pestaña General */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-4 w-4" />
                Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                  <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Correo electrónico</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{profile.email}</p>
                </div>
              </div>

              {/* Nombre */}
              <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                    <User className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Nombre completo</p>
                    {editingSection === 'personal' ? (
                      <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 w-full text-sm"
                        placeholder="Tu nombre y apellido"
                      />
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{profile.name || 'No especificado'}</p>
                    )}
                  </div>
                </div>
                {editingSection === 'personal' ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancel} className="text-xs">
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs">
                      {saving ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit('personal')}
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Fecha de registro */}
              <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                  <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Miembro desde</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {format(new Date(profile.created_at), "d 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña WhatsApp */}
        <TabsContent value="whatsapp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Configuración WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Número de WhatsApp */}
              <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                    <Smartphone className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Número de WhatsApp</p>
                    {editingSection === 'whatsapp' ? (
                      <div className="flex gap-2 mt-1">
                        <select
                          value={formData.country_code || '+54'}
                          onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                        >
                          <option value="+54">🇦🇷 +54</option>
                          <option value="+598">🇺🇾 +598</option>
                          <option value="+55">🇧🇷 +55</option>
                          <option value="+1">🇺🇸 +1</option>
                        </select>
                        <input
                          type="text"
                          value={formData.whatsapp_number || ''}
                          onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value.replace(/\D/g, '') })}
                          className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                          placeholder="93517493915"
                          maxLength={15}
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{profile.whatsapp || 'No configurado'}</p>
                    )}
                  </div>
                </div>
                {editingSection === 'whatsapp' ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancel} className="text-xs">
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs">
                      {saving ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit('whatsapp')}
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Preferencias de notificaciones */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Bell className="h-3 w-3" />
                  Notificaciones WhatsApp
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: 'daily_summary', label: 'Resumen diario', desc: 'Resumen de gastos del día' },
                    { key: 'budget_alerts', label: 'Alertas de presupuesto', desc: 'Cuando superes el 90%' },
                    { key: 'goal_reminders', label: 'Recordatorios de objetivos', desc: 'Progreso hacia tus metas' },
                    { key: 'transaction_alerts', label: 'Nuevas transacciones', desc: 'Confirmar transacciones' }
                  ].map((pref) => (
                    <Card key={pref.key}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{pref.label}</p>
                            <p className="text-xs text-gray-500">{pref.desc}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={profile.notification_preferences?.[pref.key as keyof typeof profile.notification_preferences] || false}
                            onChange={(e) => {
                              const currentPrefs = profile.notification_preferences || {
                                daily_summary: true,
                                budget_alerts: true,
                                goal_reminders: true,
                                transaction_alerts: false
                              };
                              const newPrefs = {
                                ...currentPrefs,
                                [pref.key]: e.target.checked
                              };
                              setProfile({ ...profile, notification_preferences: newPrefs });
                              updateUserProfile(user?.id || '', { notification_preferences: newPrefs });
                            }}
                            className="h-3 w-3 text-blue-600"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña Finanzas */}
        <TabsContent value="finanzas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Configuración Financiera
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Moneda preferida */}
                <div className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-800 rounded-lg">
                    <Globe className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Moneda principal</p>
                    <select
                      value={profile.preferred_currency || 'ARS'}
                      onChange={(e) => {
                        const newProfile = { ...profile, preferred_currency: e.target.value };
                        setProfile(newProfile);
                        updateUserProfile(user?.id || '', { preferred_currency: e.target.value });
                      }}
                      className="mt-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 w-full text-sm"
                    >
                      <option value="ARS">🇦🇷 Peso Argentino</option>
                      <option value="USD">🇺🇸 Dólar Estadounidense</option>
                      <option value="EUR">🇪🇺 Euro</option>
                      <option value="BRL">🇧🇷 Real Brasileño</option>
                    </select>
                  </div>
                </div>

                {/* País */}
                <div className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                    <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">País</p>
                    <select
                      value={profile.country || 'AR'}
                      onChange={(e) => {
                        const newProfile = { ...profile, country: e.target.value };
                        setProfile(newProfile);
                        updateUserProfile(user?.id || '', { country: e.target.value });
                      }}
                      className="mt-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 w-full text-sm"
                    >
                      <option value="AR">🇦🇷 Argentina</option>
                      <option value="UY">🇺🇾 Uruguay</option>
                      <option value="BR">🇧🇷 Brasil</option>
                      <option value="US">🇺🇸 Estados Unidos</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Total movido */}
              {stats && (
                <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total movido en la app</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(stats.totalAmount)}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña Estadísticas */}
        <TabsContent value="estadisticas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Tu Actividad en FinanzApp
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="text-center">
                    <CardContent className="p-4">
                      <Calendar className="h-8 w-8 mx-auto mb-3 text-blue-600" />
                      <p className="text-lg font-bold text-blue-600 mb-1">
                        {format(new Date(stats.memberSince), "MMM yyyy", { locale: es })}
                      </p>
                      <p className="text-sm text-gray-600">Miembro desde</p>
                    </CardContent>
                  </Card>

                  <Card className="text-center">
                    <CardContent className="p-4">
                      <TrendingUp className="h-8 w-8 mx-auto mb-3 text-green-600" />
                      <p className="text-lg font-bold text-green-600 mb-1">
                        {stats.totalTransactions.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">Transacciones</p>
                    </CardContent>
                  </Card>

                  <Card className="text-center">
                    <CardContent className="p-4">
                      <Target className="h-8 w-8 mx-auto mb-3 text-yellow-600" />
                      <p className="text-lg font-bold text-yellow-600 mb-1">
                        {stats.completedGoals}
                      </p>
                      <p className="text-sm text-gray-600">Objetivos logrados</p>
                    </CardContent>
                  </Card>

                  <Card className="text-center">
                    <CardContent className="p-4">
                      <BarChart3 className="h-8 w-8 mx-auto mb-3 text-red-600" />
                      <p className="text-sm font-bold text-red-600 mb-1">
                        {stats.favoriteCategory}
                      </p>
                      <p className="text-sm text-gray-600">Categoría favorita</p>
                    </CardContent>
                  </Card>

                  <Card className="text-center">
                    <CardContent className="p-4">
                      <DollarSign className="h-8 w-8 mx-auto mb-3 text-purple-600" />
                      <p className="text-lg font-bold text-purple-600 mb-1">
                        {formatCurrency(stats.totalAmount)}
                      </p>
                      <p className="text-sm text-gray-600">Total movido</p>
                    </CardContent>
                  </Card>

                  <Card className="text-center">
                    <CardContent className="p-4">
                      <MessageCircle className="h-8 w-8 mx-auto mb-3 text-indigo-600" />
                      <p className="text-lg font-bold text-indigo-600 mb-1">
                        {stats.whatsappMessages}
                      </p>
                      <p className="text-sm text-gray-600">Mensajes WhatsApp</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 