import type { Provider, User, Session } from '@supabase/supabase-js';

import { getFacebookUserData, updateProfileWithFacebookData } from '@/lib/facebook-utils';
import { getGoogleUserData, updateProfileWithGoogleData } from '@/lib/google-utils';
import { supabase } from '@/lib/supabase';
import { parseAuthError, logAuthError, AuthErrorCategory } from '@/utils/auth-error-utils';

// Session durations in seconds
export const SESSION_DURATIONS = {
  DEFAULT: 60 * 60, // 1 hour
  EXTENDED: 60 * 60 * 24 * 30, // 30 days
};

/**
 * Sign in with email and password
 *
 * @param email - User's email address
 * @param password - User's password
 * @param rememberMe - Whether to extend the session duration
 * @returns Authentication data including user and session
 */
export async function signInWithEmail(email: string, password: string, rememberMe = false) {
  try {
    // Set session expiry based on "Remember me" option
    const expiresIn = rememberMe ? SESSION_DURATIONS.EXTENDED : SESSION_DURATIONS.DEFAULT;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        expiresIn, // Set session duration
      },
    });

    if (error) {
      const parsedError = parseAuthError(error);
      logAuthError(parsedError);
      throw parsedError;
    }

    // Store the "remember me" preference in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('noa_remember_me', rememberMe ? 'true' : 'false');
    }

    return data;
  } catch (error) {
    // If error is already parsed, rethrow it
    if (error && (error as any).category) {
      throw error;
    }

    // Otherwise parse and log it
    const parsedError = parseAuthError(error);
    logAuthError(parsedError);
    throw parsedError;
  }
}

/**
 * Sign up with email, password and username
 *
 * @param email - User's email address
 * @param password - User's password
 * @param username - User's desired username
 * @returns Authentication data including user and session
 */
export async function signUpWithEmail(email: string, password: string, username: string) {
  try {
    // Check if username already exists before attempting signup
    const { data: existingUsers, error: checkError } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (checkError) {
      const parsedError = parseAuthError(checkError);
      logAuthError(parsedError);
      throw parsedError;
    }

    if (existingUsers) {
      const error = {
        message: 'Username already exists. Please choose another username.',
        category: AuthErrorCategory.VALIDATION,
        suggestion: 'Try a different username that is unique.',
      };
      logAuthError(error);
      throw error;
    }

    // First, create the user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });

    if (error) {
      const parsedError = parseAuthError(error);
      logAuthError(parsedError);
      throw parsedError;
    }

    if (!data.user) {
      const error = {
        message: 'User creation failed. Please try again.',
        category: AuthErrorCategory.UNKNOWN,
      };
      logAuthError(error);
      throw error;
    }

    // Wait a moment to allow any database triggers to complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check if profile was created by trigger
    const { data: profile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    // If profile doesn't exist yet, create it manually
    if (profileCheckError || !profile) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        username,
        email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          source: 'email_signup',
        },
      });

      if (profileError) {
        // Log but don't throw as user was created successfully
        const parsedError = parseAuthError(profileError);
        logAuthError({
          ...parsedError,
          message: 'Warning: User created but profile creation failed.',
        });
      }
    }

    return data;
  } catch (error) {
    // If error is already parsed, rethrow it
    if (error && (error as any).category) {
      throw error;
    }

    // Otherwise parse and log it
    const parsedError = parseAuthError(error);
    logAuthError(parsedError);
    throw parsedError;
  }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      const parsedError = parseAuthError(error);
      logAuthError(parsedError);
      throw parsedError;
    }

    // Clear remember me preference
    if (typeof window !== 'undefined') {
      localStorage.removeItem('noa_remember_me');
    }

    return { success: true };
  } catch (error) {
    // If error is already parsed, rethrow it
    if (error && (error as any).category) {
      throw error;
    }

    // Otherwise parse and log it
    const parsedError = parseAuthError(error);
    logAuthError(parsedError);
    throw parsedError;
  }
}

/**
 * Reset password for a user
 *
 * @param email - User's email address
 */
export async function resetPassword(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth`,
    });

    if (error) {
      const parsedError = parseAuthError(error);
      logAuthError(parsedError);
      throw parsedError;
    }

    return { success: true };
  } catch (error) {
    // If error is already parsed, rethrow it
    if (error && (error as any).category) {
      throw error;
    }

    // Otherwise parse and log it
    const parsedError = parseAuthError(error);
    logAuthError(parsedError);
    throw parsedError;
  }
}

/**
 * Sign in with a social provider
 *
 * @param provider - The social provider to use (e.g., 'google', 'facebook')
 * @returns Authentication data
 */
export async function signInWithSocialProvider(provider: Provider) {
  try {
    // Check if "remember me" was previously selected
    const rememberMe =
      typeof window !== 'undefined' && localStorage.getItem('noa_remember_me') === 'true';

    // Store the "remember me" preference for future social logins
    if (typeof window !== 'undefined' && !localStorage.getItem('noa_remember_me')) {
      localStorage.setItem('noa_remember_me', 'false'); // Default to false if not set
    }

    // Configure provider-specific options
    const options: Record<string, any> = {
      redirectTo: `${window.location.origin}/auth/callback`,
    };

    // Add provider-specific scopes
    if (provider === 'google') {
      options.scopes = 'email profile';
      if (rememberMe) {
        options.scopes += ' offline_access';
      }
    } else if (provider === 'facebook') {
      options.scopes = 'email,public_profile';
      if (rememberMe) {
        options.scopes += ',user_friends';
      }
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options,
    });

    if (error) {
      const parsedError = parseAuthError(error);
      logAuthError(parsedError);
      throw parsedError;
    }

    return data;
  } catch (error) {
    // If error is already parsed, rethrow it
    if (error && (error as any).category) {
      throw error;
    }

    // Otherwise parse and log it
    const parsedError = parseAuthError(error);
    logAuthError(parsedError);
    throw parsedError;
  }
}

/**
 * Process social login data after successful authentication
 * @param session - The user session
 * @returns The updated user profile
 */
export async function processSocialLoginData(session: Session): Promise<any> {
  try {
    if (!session || !session.user) {
      throw {
        message: 'No session or user found',
        category: AuthErrorCategory.CREDENTIALS,
      };
    }

    const { user, provider_token, provider_refresh_token } = session;
    const provider = user.app_metadata?.provider as string;

    if (!provider) {
      return null; // Not a social login
    }

    // Process based on provider
    if (provider === 'facebook' && provider_token) {
      const facebookData = await getFacebookUserData(provider_token);
      return await updateProfileWithFacebookData(user.id, facebookData);
    } else if (provider === 'google' && provider_token) {
      const googleData = await getGoogleUserData(provider_token);
      return await updateProfileWithGoogleData(user.id, googleData);
    }

    return null;
  } catch (error) {
    // Log but don't throw to avoid breaking auth flow
    const parsedError = parseAuthError(error);
    logAuthError({
      ...parsedError,
      message: 'Warning: Failed to process social login data.',
    });
    return null;
  }
}

/**
 * Refresh the current session
 *
 * @returns The refreshed session data and success status
 */
export async function refreshSession(): Promise<{
  success: boolean;
  session: Session | null;
  user: User | null;
}> {
  try {
    // First check if we have a session
    const { data: sessionData } = await supabase.auth.getSession();

    // If no session exists, return early with success: false
    if (!sessionData.session) {
      return { success: false, session: null, user: null };
    }

    // Check if session is close to expiry
    const expiresAt = sessionData.session.expires_at ? sessionData.session.expires_at * 1000 : 0;
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    // Only refresh if session exists and is valid but will expire soon
    // or has less than 30 minutes left (to avoid unnecessary refreshes)
    if (timeUntilExpiry > 0 && timeUntilExpiry < 30 * 60 * 1000) {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        const parsedError = parseAuthError(error);
        logAuthError(parsedError);

        // If the error is network-related, don't invalidate the session yet
        if (parsedError.category === AuthErrorCategory.Network) {
          console.log('Network error during refresh, keeping existing session');
          return {
            success: true,
            session: sessionData.session,
            user: sessionData.session.user,
          };
        }

        return { success: false, session: null, user: null };
      }

      return {
        success: true,
        session: data.session,
        user: data.session?.user ?? null,
      };
    }

    // Session is still valid and not close to expiry
    return {
      success: true,
      session: sessionData.session,
      user: sessionData.session.user,
    };
  } catch (error) {
    const parsedError = parseAuthError(error);
    logAuthError(parsedError);

    // Try to get the current session as a fallback
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        return {
          success: true,
          session: data.session,
          user: data.session.user,
        };
      }
    } catch (e) {
      const fallbackError = parseAuthError(e);
      logAuthError({
        ...fallbackError,
        message: 'Fallback session check failed',
      });
    }

    return { success: false, session: null, user: null };
  }
}

/**
 * Get the current session
 *
 * @returns The current session data
 */
export async function getCurrentSession() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      const parsedError = parseAuthError(error);
      logAuthError(parsedError);
      return { session: null, user: null };
    }

    return {
      session: data.session,
      user: data.session?.user ?? null,
    };
  } catch (error) {
    const parsedError = parseAuthError(error);
    logAuthError(parsedError);
    return { session: null, user: null };
  }
}

export type Subscription = {
  id: string;
  paystack_customer_id: string | null;
  plan: string;
  status: string;
  current_period_end: string | null;
  updated_at: string;
};

/**
 * Retrieve the user's current subscription
 */
export async function getUserSubscription(userId: string) {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, paystack_customer_id, plan, status, current_period_end, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data as Subscription | null;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
}
