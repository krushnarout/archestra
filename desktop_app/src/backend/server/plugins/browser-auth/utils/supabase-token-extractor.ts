/**
 * Supabase Token Extraction Utilities
 *
 * Utilities for extracting Supabase authentication tokens from the browser
 */

interface SupabaseTokenExtractionResult {
  success: boolean;
  accessToken?: string;
  userId?: string | null;
  error?: string;
}

/**
 * Extract Supabase personal access token or JWT from localStorage/sessionStorage/DOM
 * This runs in the browser context
 */
export const SUPABASE_TOKEN_EXTRACTION_SCRIPT = `
  (function() {
    function isValidSupabaseToken(token) {
      return (
        /^sbp_[a-f0-9]{40}$/.test(token) || // PAT
        /^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$/.test(token) // JWT
      );
    }

    try {
      console.log('[Supabase Token Extraction] Starting token extraction...');
      console.log('[Supabase Token Extraction] Current URL:', window.location.href);

      // Method 1: Check localStorage for Supabase session/auth data
      console.log('[Supabase Token Extraction] Checking localStorage for Supabase auth data...');

      const supabaseKeys = [
        'supabase.auth.token',
        'sb-auth-token',
        'supabase-auth-token',
        'access_token',
        'personal_access_token',
        'pat',
        'api_token'
      ];

      for (const key of supabaseKeys) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            console.log(\`[Supabase Token Extraction] Found data in localStorage key: \${key}\`);

            try {
              const parsed = JSON.parse(value);

              if (parsed.access_token && isValidSupabaseToken(parsed.access_token)) {
                console.log('[Supabase Token Extraction] Found token in parsed JSON');
                return {
                  success: true,
                  accessToken: parsed.access_token,
                  userId: parsed.user?.id || parsed.user_id || null
                };
              }
            } catch (e) {
              if (isValidSupabaseToken(value)) {
                console.log('[Supabase Token Extraction] Found direct token in localStorage');
                return {
                  success: true,
                  accessToken: value,
                  userId: null
                };
              }
            }
          }
        } catch (e) {
          console.log(\`[Supabase Token Extraction] Error accessing localStorage key \${key}:\`, e.message);
        }
      }

      // Method 2: Search all localStorage keys
      console.log('[Supabase Token Extraction] Searching all localStorage keys...');
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            try {
              const value = localStorage.getItem(key);
              if (value) {
                const tokenMatch = value.match(/(sbp_[a-f0-9]{40}|eyJ[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+)/);
                if (tokenMatch) {
                  console.log(\`[Supabase Token Extraction] Found token in localStorage key: \${key}\`);
                  return {
                    success: true,
                    accessToken: tokenMatch[0],
                    userId: null
                  };
                }

                try {
                  const parsed = JSON.parse(value);
                  const findTokenInObject = (obj) => {
                    if (typeof obj === 'string' && isValidSupabaseToken(obj)) {
                      return obj;
                    }
                    if (typeof obj === 'object' && obj !== null) {
                      for (const v of Object.values(obj)) {
                        const result = findTokenInObject(v);
                        if (result) return result;
                      }
                    }
                    return null;
                  };

                  const foundToken = findTokenInObject(parsed);
                  if (foundToken) {
                    console.log(\`[Supabase Token Extraction] Found token in nested JSON in key: \${key}\`);
                    return {
                      success: true,
                      accessToken: foundToken,
                      userId: parsed.user?.id || parsed.user_id || null
                    };
                  }
                } catch (e) {
                  // not JSON
                }
              }
            } catch (e) {
              console.log(\`[Supabase Token Extraction] Error accessing localStorage key \${key}:\`, e.message);
            }
          }
        }
      } catch (e) {
        console.log('[Supabase Token Extraction] Could not iterate localStorage:', e.message);
      }

      // Method 3: Check sessionStorage
      console.log('[Supabase Token Extraction] Checking sessionStorage...');
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) {
            try {
              const value = sessionStorage.getItem(key);
              if (value) {
                const tokenMatch = value.match(/(sbp_[a-f0-9]{40}|eyJ[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+)/);
                if (tokenMatch) {
                  console.log(\`[Supabase Token Extraction] Found token in sessionStorage key: \${key}\`);
                  return {
                    success: true,
                    accessToken: tokenMatch[0],
                    userId: null
                  };
                }
              }
            } catch (e) {
              console.log(\`[Supabase Token Extraction] Error accessing sessionStorage key \${key}:\`, e.message);
            }
          }
        }
      } catch (e) {
        console.log('[Supabase Token Extraction] Could not access sessionStorage:', e.message);
      }

      // Method 4: Fallback DOM search
      console.log('[Supabase Token Extraction] Fallback: searching page for visible tokens...');
      const allText = document.documentElement.textContent || '';
      const pageTokenMatch = allText.match(/(sbp_[a-f0-9]{40}|eyJ[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+)/);
      if (pageTokenMatch) {
        console.log('[Supabase Token Extraction] Found token in page text');
        return {
          success: true,
          accessToken: pageTokenMatch[0],
          userId: null
        };
      }

      console.log('[Supabase Token Extraction] No token found with any method');
      return {
        success: false,
        error: 'No token found. Please ensure you are logged in or have created a personal access token.'
      };

    } catch (error) {
      console.error('[Supabase Token Extraction] Error:', error);
      return { success: false, error: error.message };
    }
  })();
`;

/**
 * Build the Supabase token extraction script
 */
export function buildSupabaseTokenExtractionScript(): string {
  return SUPABASE_TOKEN_EXTRACTION_SCRIPT;
}

/**
 * Validate if we're on a Supabase tokens page or dashboard
 */
export function isSupabaseTokenPage(url: string): boolean {
  return (
    url.includes('supabase.com/dashboard') ||
    url.includes('app.supabase.com') ||
    url.includes('/account/tokens') ||
    url.includes('/settings/tokens') ||
    url.includes('/tokens') ||
    url.includes('supabase.com/dashboard/account') ||
    url.includes('supabase.com/dashboard/project')
  );
}

/**
 * Validate Supabase token format (PAT or JWT)
 */
export function isValidSupabaseToken(token: string): boolean {
  return (
    /^sbp_[a-f0-9]{40}$/.test(token) || // PAT
    /^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$/.test(token) // JWT
  );
}

/**
 * Build Supabase dashboard URL for token management
 */
export function buildSupabaseTokensUrl(): string {
  return 'https://supabase.com/dashboard/account/tokens';
}
