"use client";
import { useEffect, useState } from 'react';
import { getUserProfile, updateUserProfile, createUserProfile } from '@/services/auth';
import { useUser } from '@/hooks/useUser';
import { toast } from '@/hooks/use-toast';

export default function PerfilPage() {
  const { user } = useUser();
  const [whatsapp, setWhatsapp] = useState('');
  const [originalWhatsapp, setOriginalWhatsapp] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [countryCode, setCountryCode] = useState('+54');
  const [profileNotFound, setProfileNotFound] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      getUserProfile(user.id)
        .then((profile) => {
          setProfileNotFound(false);
          if (profile?.whatsapp) {
            const match = profile.whatsapp.match(/^(\+\d{2,3})(\d{6,15})$/);
            if (match) {
              setCountryCode(match[1]);
              setWhatsapp(match[2]);
              setOriginalWhatsapp(match[2]);
            } else {
              setWhatsapp(profile.whatsapp);
              setOriginalWhatsapp(profile.whatsapp);
            }
          }
        })
        .catch(() => {
          setProfileNotFound(true);
        })
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    const fullNumber = `${countryCode}${whatsapp}`;
    if (!/^\+\d{6,15}$/.test(fullNumber)) {
      setError('Número inválido.');
      setSaving(false);
      return;
    }
    try {
      if (!user?.id) throw new Error('Usuario no autenticado');
      await updateUserProfile(user.id, { whatsapp: fullNumber });
      setOriginalWhatsapp(whatsapp);
      setShowEdit(false);
      toast({
        title: '¡Éxito!',
        description: 'Tu número de WhatsApp fue guardado correctamente.'
      });
    } catch (e) {
      setError('No se pudo guardar el número.');
      toast({
        title: 'Error',
        description: 'Ocurrió un error al guardar. Por favor, vuelve a intentarlo.'
      });
    } finally {
      setSaving(false);
    }
  };

  // NUEVO: función para crear el perfil si no existe
  const handleCreateProfile = async () => {
    setSaving(true);
    setError('');
    try {
      if (!user?.id || !user.email) throw new Error('Usuario no autenticado');
      await createUserProfile(user.id, user.email);
      setProfileNotFound(false);
      toast({
        title: '¡Perfil creado!',
        description: 'Tu perfil fue creado correctamente. Ahora puedes editar tu WhatsApp.'
      });
    } catch (e) {
      setError('No se pudo crear el perfil.');
      toast({
        title: 'Error',
        description: 'Ocurrió un error al crear el perfil. Intenta de nuevo.'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Cargando perfil...</div>;

  if (profileNotFound) {
    return (
      <div className="max-w-xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-6">Perfil</h1>
        <div className="bg-zinc-900 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-2">No tienes perfil creado</h2>
          <p className="text-zinc-400 mb-4">Para poder editar tu WhatsApp, primero debes crear tu perfil.</p>
          {error && <div className="text-red-500 mb-2">{error}</div>}
          <button
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
            onClick={handleCreateProfile}
            disabled={saving}
          >
            {saving ? 'Creando...' : 'Crear perfil'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Perfil</h1>
      <div className="bg-zinc-900 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold mb-2">Número de WhatsApp</h2>
        <p className="text-zinc-400 mb-4">Tu número de WhatsApp para recibir notificaciones</p>
        <div className="flex items-center gap-2 mb-4">
          <select
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white"
            value={countryCode}
            onChange={e => setCountryCode(e.target.value)}
            disabled={!showEdit}
          >
            <option value="+54">AR +54</option>
            <option value="+598">UY +598</option>
            <option value="+55">BR +55</option>
            <option value="+1">US +1</option>
          </select>
          <input
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white flex-1"
            type="text"
            placeholder="93517493915"
            value={whatsapp}
            onChange={e => setWhatsapp(e.target.value.replace(/\D/g, ''))}
            disabled={!showEdit}
            maxLength={15}
          />
        </div>
        <p className="text-xs text-zinc-500 mb-4">Ingresa solo el número sin el código de país, por ejemplo: 93517493915</p>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        {showEdit ? (
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded bg-zinc-700 text-white hover:bg-zinc-600"
              onClick={() => { setShowEdit(false); setWhatsapp(originalWhatsapp); setError(''); }}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        ) : (
          <button
            className="px-4 py-2 rounded bg-zinc-700 text-white hover:bg-zinc-600"
            onClick={() => setShowEdit(true)}
          >
            Editar
          </button>
        )}
      </div>
    </div>
  );
} 