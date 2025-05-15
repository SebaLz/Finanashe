import { supabase } from '@/lib/supabase';

export type UserCredentials = {
  email: string;
  password: string;
};

export type UserProfile = {
  name?: string;
  phone?: string;
  whatsapp?: string;
};

export async function signUp(credentials: UserCredentials, profile?: UserProfile) {
  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      data: profile
    }
  });

  if (error) {
    console.error('Error signing up:', error);
    throw new Error('No se pudo registrar el usuario');
  }

  // Crear el perfil de usuario usando el cliente público
  if (data.user) {
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || null,
        phone: data.user.user_metadata?.phone || null,
        whatsapp: data.user.user_metadata?.whatsapp || null
      });

    if (profileError) {
      console.error('Error creating user profile during sign up:', profileError);
      throw new Error('No se pudo crear el perfil de usuario. Contacta al soporte.');
    }
  }

  return data;
}

export async function signIn(credentials: UserCredentials) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password
  });

  if (error) {
    console.error('Error signing in:', error);
    throw new Error('No se pudo iniciar sesión');
  }

  // Verificar si el usuario ya tiene un perfil, si no, crearlo usando el cliente público
  if (data.user) {
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', data.user.id)
      .single();

    if (!existingProfile) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || null,
          phone: data.user.user_metadata?.phone || null,
          whatsapp: data.user.user_metadata?.whatsapp || null
        });

      if (profileError) {
        console.error('Error creating user profile during sign in:', profileError);
      }
    }
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error signing out:', error);
    throw new Error('No se pudo cerrar sesión');
  }

  return true;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    throw new Error('No se pudo obtener el perfil de usuario');
  }

  return data;
}

export async function updateUserProfile(userId: string, profile: Partial<UserProfile>) {
  const { data, error } = await supabase
    .from('users')
    .update(profile)
    .eq('id', userId)
    .select();

  if (error) {
    console.error('Error updating user profile:', error);
    throw new Error('No se pudo actualizar el perfil de usuario');
  }

  return data[0];
}

export async function createUserProfile(userId: string, email: string) {
  const { data, error } = await supabase
    .from('users')
    .insert({ id: userId, email });

  if (error) {
    console.error('Error creating user profile:', error);
    throw new Error('No se pudo crear el perfil de usuario');
  }

  if (!data) return null;
  return data[0];
} 