import { createClient, SupabaseClient, User as SupabaseUser, Session } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://kfazmtyzpmebbswjamsr.supabase.co';

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYXptdHl6cG1lYmJzd2phbXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMjI3OTQsImV4cCI6MjEwMjU5ODc5NH0.w77NgEjzPT2Rnp_wiBaKBdGBPnxa7Lr7octeKXFkqcA';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return supabaseInstance;
}

export const isSupabaseConfigured = (): boolean => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
};

export const getSupabaseStatus = async (): Promise<{ connected: boolean; message: string }> => {
  const client = getSupabase();
  if (!client) {
    return { connected: false, message: 'Supabase URL and API Key are not configured.' };
  }
  try {
    const { error } = await client.auth.getSession();
    if (error) throw error;
    return { connected: true, message: 'Connected to Supabase Cloud Database & Auth' };
  } catch (err: any) {
    return { connected: false, message: err.message || 'Supabase connection error' };
  }
};

/**
 * Authenticate via Supabase Auth with Email and Password
 */
export async function signInWithSupabase(email: string, password: string) {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password: password.trim(),
  });
  if (error) throw error;
  return data;
}

/**
 * Register / Sign up via Supabase Auth
 */
export async function signUpWithSupabase(email: string, password: string, fullName?: string, roleName?: string) {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }
  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password: password.trim(),
    options: {
      data: {
        full_name: fullName || '',
        role: roleName || 'Staff',
      },
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Send password reset email via Supabase Auth
 */
export async function resetPasswordWithSupabase(email: string) {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }
  const { data, error } = await client.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
  return data;
}

/**
 * Sync user profile to Supabase database table `users`
 */
export async function syncUserProfile(profile: {
  id: string;
  email: string;
  name: string;
  role_id?: string;
  role_name?: string;
  avatar?: string;
  department?: string;
  assigned_location_id?: string;
  password_hash?: string;
}) {
  const client = getSupabase();
  if (!client) return;
  try {
    // Map roleId from role_id or role_name
    let roleId = profile.role_id;
    if (!roleId && profile.role_name) {
      roleId =
        profile.role_name === 'Admin'
          ? 'role-admin'
          : profile.role_name === 'Inventory Manager'
          ? 'role-manager'
          : profile.role_name === 'Auditor'
          ? 'role-auditor'
          : 'role-staff';
    }

    await client.from('users').upsert(
      {
        id: profile.id,
        name: profile.name,
        email: profile.email.toLowerCase(),
        password_hash: profile.password_hash || 'staff123',
        role_id: roleId || 'role-staff',
        department: profile.department || 'Disaster Emergency Response',
        assigned_location_id: profile.assigned_location_id || null,
        avatar_url: profile.avatar || null,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch (err) {
    console.warn('Users table sync skipped or notice:', err);
  }
}

/**
 * Sign out from Supabase Auth
 */
export async function signOutFromSupabase() {
  const client = getSupabase();
  if (!client) return;
  try {
    await client.auth.signOut();
  } catch (err) {
    console.warn('Supabase sign-out notice:', err);
  }
}

/**
 * Ensure an active Supabase Auth JWT session is established so that
 * RLS policies for 'authenticated' users are satisfied.
 */
export async function ensureSupabaseAuthSession(
  email?: string,
  password?: string
) {
  const client = getSupabase();
  if (!client) return null;

  try {
    // 1. Check existing active session
    const { data: sessionData } = await client.auth.getSession();
    if (sessionData?.session?.user) {
      return sessionData.session;
    }

    if (!email || !password) return null;

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    // 2. Try sign-in with provided credentials
    const { data: signInData, error: signInErr } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPass,
    });
    if (!signInErr && signInData.session) {
      return signInData.session;
    }
  } catch (err) {
    // Silently continue
  }
  return null;
}

/**
 * High-performance client-side image compressor.
 * Downscales huge raw camera photos (5MB - 12MB) to lightweight WebP format (~60KB - 150KB)
 * preserving crisp visual clarity for emergency inventory and profile photos.
 */
export async function compressImage(
  file: File | Blob,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'image/webp' | 'image/jpeg' | 'image/png';
  } = {}
): Promise<{ blob: Blob; format: string; extension: string }> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.82,
    format = 'image/webp',
  } = options;

  return new Promise((resolve) => {
    // If running in non-browser context or SVG, return original
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      resolve({ blob: file, format: file.type || 'image/png', extension: 'png' });
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      // Scale proportionally if dimensions exceed max limits
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ blob: file, format: file.type || 'image/png', extension: 'png' });
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const ext = format === 'image/webp' ? 'webp' : format === 'image/jpeg' ? 'jpg' : 'png';
            resolve({ blob, format, extension: ext });
          } else {
            resolve({ blob: file, format: file.type || 'image/png', extension: 'png' });
          }
        },
        format,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ blob: file, format: file.type || 'image/png', extension: 'png' });
    };

    img.src = objectUrl;
  });
}

/**
 * Upload an item product/asset photo to Supabase Storage Bucket 'item_image'
 * Automatically compresses image before upload.
 * Returns the public URL of the uploaded image.
 */
export async function uploadItemImageToSupabase(
  file: File | Blob,
  fileNameHint?: string
): Promise<string> {
  const client = getSupabase();
  if (!client) throw new Error('Supabase client is not configured.');

  // Automatically compress item photo (max 1200x1200, WebP 82% quality)
  const { blob, format, extension } = await compressImage(file, {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.82,
    format: 'image/webp',
  });

  const cleanName = (fileNameHint || 'item')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 30);
  const filePath = `items/${Date.now()}_${cleanName}.${extension}`;

  const { error } = await client.storage
    .from('item_image')
    .upload(filePath, blob, {
      cacheControl: '31536000', // 1 year cache
      upsert: true,
      contentType: format,
    });

  if (error) {
    console.error('❌ Supabase storage item_image upload error:', error);
    throw error;
  }

  const { data: publicUrlData } = client.storage
    .from('item_image')
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

/**
 * Upload a user profile avatar / officer portrait to Supabase Storage Bucket 'user_profile'
 * Automatically compresses avatar before upload.
 * Returns the public URL of the uploaded image.
 */
export async function uploadUserProfilePhotoToSupabase(
  file: File | Blob,
  userNameHint?: string
): Promise<string> {
  const client = getSupabase();
  if (!client) throw new Error('Supabase client is not configured.');

  const cleanName = (userNameHint || 'user')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 30);
  const timestamp = Date.now();

  // Tier 1: WebP compression (max 600x600)
  try {
    const { blob, format, extension } = await compressImage(file, {
      maxWidth: 600,
      maxHeight: 600,
      quality: 0.85,
      format: 'image/webp',
    });

    // Try in avatars/ folder
    const filePath = `avatars/${timestamp}_${cleanName}.${extension}`;
    const { error: err1 } = await client.storage
      .from('user_profile')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: format,
      });

    if (!err1) {
      const { data } = client.storage.from('user_profile').getPublicUrl(filePath);
      if (data?.publicUrl) return data.publicUrl;
    }

    // Try in root of user_profile bucket
    const rootPath = `${timestamp}_${cleanName}.${extension}`;
    const { error: err2 } = await client.storage
      .from('user_profile')
      .upload(rootPath, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: format,
      });

    if (!err2) {
      const { data } = client.storage.from('user_profile').getPublicUrl(rootPath);
      if (data?.publicUrl) return data.publicUrl;
    }
  } catch (compErr) {
    console.warn('WebP avatar compression notice:', compErr);
  }

  // Tier 2: PNG compression (max 600x600)
  try {
    const { blob, format, extension } = await compressImage(file, {
      maxWidth: 600,
      maxHeight: 600,
      quality: 0.85,
      format: 'image/png',
    });

    const rootPath = `${timestamp}_${cleanName}.${extension}`;
    const { error: errPng } = await client.storage
      .from('user_profile')
      .upload(rootPath, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: format,
      });

    if (!errPng) {
      const { data } = client.storage.from('user_profile').getPublicUrl(rootPath);
      if (data?.publicUrl) return data.publicUrl;
    }
  } catch (pngErr) {
    console.warn('PNG avatar compression notice:', pngErr);
  }

  // Tier 3: Direct raw file upload
  const rawExt = file instanceof File && file.name.includes('.') ? file.name.split('.').pop() : 'png';
  const rawPath = `${timestamp}_${cleanName}.${rawExt}`;
  const { error: rawErr } = await client.storage
    .from('user_profile')
    .upload(rawPath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (rawErr) {
    console.error('❌ Supabase storage user_profile upload error:', rawErr);
    throw new Error(rawErr.message || 'Avatar upload failed');
  }

  const { data: rawPublicData } = client.storage
    .from('user_profile')
    .getPublicUrl(rawPath);

  return rawPublicData.publicUrl;
}

/**
 * Upload an organization logo to Supabase Storage Bucket 'logo'.
 * Automatically compresses to max 512x512 WebP.
 * Returns the public URL of the uploaded logo.
 */
export async function uploadLogoToSupabase(
  file: File | Blob,
  nameHint?: string
): Promise<string> {
  const client = getSupabase();
  if (!client) throw new Error('Supabase client is not configured.');

  const cleanName = (nameHint || 'org_logo')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 30);
  const timestamp = Date.now();

  // Tier 1: Compress as WebP (max 512x512)
  try {
    const { blob, format, extension } = await compressImage(file, {
      maxWidth: 512,
      maxHeight: 512,
      quality: 0.9,
      format: 'image/webp',
    });

    // Try path in branding/
    const filePath = `branding/${timestamp}_${cleanName}.${extension}`;
    const { error: err1 } = await client.storage
      .from('logo')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: format,
      });

    if (!err1) {
      const { data } = client.storage.from('logo').getPublicUrl(filePath);
      if (data?.publicUrl) return data.publicUrl;
    }

    // Try path in root of 'logo' bucket
    const rootPath = `${timestamp}_${cleanName}.${extension}`;
    const { error: err2 } = await client.storage
      .from('logo')
      .upload(rootPath, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: format,
      });

    if (!err2) {
      const { data } = client.storage.from('logo').getPublicUrl(rootPath);
      if (data?.publicUrl) return data.publicUrl;
    }
  } catch (compErr) {
    console.warn('WebP logo upload attempt notice:', compErr);
  }

  // Tier 2: Compress as PNG (max 512x512)
  try {
    const { blob, format, extension } = await compressImage(file, {
      maxWidth: 512,
      maxHeight: 512,
      quality: 0.9,
      format: 'image/png',
    });

    const rootPath = `${timestamp}_${cleanName}.${extension}`;
    const { error: errPng } = await client.storage
      .from('logo')
      .upload(rootPath, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: format,
      });

    if (!errPng) {
      const { data } = client.storage.from('logo').getPublicUrl(rootPath);
      if (data?.publicUrl) return data.publicUrl;
    }
  } catch (pngErr) {
    console.warn('PNG logo upload attempt notice:', pngErr);
  }

  // Tier 3: Direct raw file upload
  const rawExt = file instanceof File && file.name.includes('.') ? file.name.split('.').pop() : 'png';
  const rawPath = `${timestamp}_${cleanName}.${rawExt}`;
  const { error: rawErr } = await client.storage
    .from('logo')
    .upload(rawPath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (rawErr) {
    console.error('❌ Supabase storage logo raw upload error:', rawErr);
    throw new Error(rawErr.message || 'Storage bucket upload rejected');
  }

  const { data: rawPublicData } = client.storage
    .from('logo')
    .getPublicUrl(rawPath);

  return rawPublicData.publicUrl;
}

/**
 * Fetch the latest uploaded logo URL from Supabase Storage Bucket 'logo'.
 * Returns the public URL of the most recently uploaded branding logo, or null if none exists.
 */
export async function fetchLatestLogoFromSupabase(): Promise<string | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    // 1. Try listing in 'branding' folder
    const { data: brandingData } = await client.storage
      .from('logo')
      .list('branding', {
        limit: 10,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    const brandingFile = brandingData?.find(
      (f) => f.name && !f.name.startsWith('.') && f.id
    );

    if (brandingFile) {
      const { data: publicUrlData } = client.storage
        .from('logo')
        .getPublicUrl(`branding/${brandingFile.name}`);
      if (publicUrlData?.publicUrl) return publicUrlData.publicUrl;
    }

    // 2. Try listing in root of 'logo' bucket
    const { data: rootData } = await client.storage
      .from('logo')
      .list('', {
        limit: 10,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    const rootFile = rootData?.find(
      (f) => f.name && !f.name.startsWith('.') && f.id
    );

    if (rootFile) {
      const { data: rootUrlData } = client.storage
        .from('logo')
        .getPublicUrl(rootFile.name);
      return rootUrlData?.publicUrl || null;
    }

    return null;
  } catch (err) {
    console.warn('Failed to fetch logo from Supabase storage:', err);
    return null;
  }
}

/**
 * Register a new user in Supabase Auth so they can log in with signInWithPassword.
 * If the user already exists, silently ignores the duplicate error.
 */
export async function registerSupabaseAuthUser(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) return { success: false, error: 'Supabase not configured.' };

  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim() || 'staff123';

  try {
    const { data, error } = await client.auth.signUp({
      email: cleanEmail,
      password: cleanPass,
    });

    if (error) {
      // "User already registered" is not a real error for our purposes
      if (error.message?.toLowerCase().includes('already registered') ||
          error.message?.toLowerCase().includes('already exists')) {
        return { success: true };
      }
      console.warn('Supabase Auth signUp warning:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('registerSupabaseAuthUser error:', err);
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

export type { SupabaseUser, Session };
