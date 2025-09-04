import { OAuthProviderDefinition } from '../provider-interface';
import {
  buildSupabaseTokenExtractionScript,
  isSupabaseAuthenticatedPage,
  isSupabaseLoginPage,
} from '../utils/supabase-token-extractor';

export const supabaseBrowserProvider: OAuthProviderDefinition = {
  name: 'supabase-browser',
  scopes: [], // Not used for browser auth
  usePKCE: false, // Not used for browser auth
  clientId: 'browser-auth', // Placeholder

  // Token pattern for Supabase access tokens
  tokenEnvVarPattern: {
    accessToken: 'SUPABASE_ACCESS_TOKEN', // Maps to primary_token
  },

  // Browser-based authentication configuration
  browserAuthConfig: {
    enabled: true,
    loginUrl: 'https://supabase.com/dashboard/sign-in',

    // Map browser tokens to environment variables
    tokenMapping: {
      primary: 'SUPABASE_ACCESS_TOKEN',
    },

    navigationRules: (url: string) => {
      // Only allow navigation to official Supabase domains
      try {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname;
        return (
          hostname === 'supabase.com' ||
          hostname === 'app.supabase.com' ||
          hostname === 'supabase.io' ||
          (hostname.endsWith('.supabase.com') && hostname.length > '.supabase.com'.length) ||
          (hostname.endsWith('.supabase.io') && hostname.length > '.supabase.io'.length)
        );
      } catch (e) {
        // If URL parsing fails, deny navigation
        return false;
      }
    },

    extractTokens: async (windowWithContext: any) => {
      // Extract the actual window parts and context
      const { webContents, session, context } = windowWithContext;
      const url = webContents.getURL();

      console.log('[Supabase Browser Auth] Attempting token extraction on:', url);

      // Check if we're on a login page
      if (isSupabaseLoginPage(url)) {
        console.log('[Supabase Browser Auth] Still on login page, waiting for authentication');
        return null;
      }

      // Only try to extract on authenticated pages
      if (!isSupabaseAuthenticatedPage(url)) {
        console.log('[Supabase Browser Auth] Not an authenticated page, waiting for user to log in');
        return null;
      }

      try {
        // Extract project reference from URL if available
        let projectRef = null;
        const projectMatch = url.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9-_]+)/);
        if (projectMatch) {
          projectRef = projectMatch[1];
          console.log('[Supabase Browser Auth] Found project reference:', projectRef);
        }

        const extractionScript = buildSupabaseTokenExtractionScript(projectRef);
        const result = await webContents.executeJavaScript(extractionScript);

        console.log('[Supabase Browser Auth] Page verification result:', {
          success: result.success,
          error: result.error,
        });

        let accessToken = null;
        try {
          const tokenScript = `
            (function() {
              try {
                // Look for Supabase auth tokens in localStorage
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
                    const value = localStorage.getItem(key);
                    if (value) {
                      try {
                        const parsed = JSON.parse(value);
                        
                        // Check for access_token
                        if (parsed.access_token) {
                          return parsed.access_token;
                        }
                        
                        if (parsed.session && parsed.session.access_token) {
                          return parsed.session.access_token;
                        }
                        
                        if (parsed.user && parsed.session && parsed.session.access_token) {
                          return parsed.session.access_token;
                        }
                      } catch (parseError) {
                        continue;
                      }
                    }
                  }
                }
                
                return null;
              } catch (error) {
                return null;
              }
            })();
          `;

          accessToken = await webContents.executeJavaScript(tokenScript);
          console.log('[Supabase Browser Auth] Found access token:', !!accessToken);
        } catch (error) {
          console.error('[Supabase Browser Auth] Error extracting token from localStorage:', error);
        }

        if (result.success && accessToken) {
          console.log('[Supabase Browser Auth] Successfully extracted access token');

          return {
            primary_token: accessToken,
            project_ref: projectRef,
            extracted_from: url,
          };
        }

        if (!result.success) {
          console.error('[Supabase Browser Auth] Page verification failed:', result.error);
        } else if (!accessToken) {
          console.error('[Supabase Browser Auth] Missing access token (localStorage not found)');
        }
        return null;
      } catch (error) {
        console.error('[Supabase Browser Auth] Token extraction failed:', error);
        return null;
      }
    },
  },

  metadata: {
    displayName: 'Supabase (Browser Auth)',
    documentationUrl: 'https://supabase.com/docs/guides/api/api-keys',
    supportsRefresh: false,
    notes: 'Direct browser authentication using personal access tokens. No OAuth app required.',
  },
};
