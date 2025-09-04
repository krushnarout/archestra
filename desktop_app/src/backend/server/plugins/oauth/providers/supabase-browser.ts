import { OAuthProviderDefinition } from '../provider-interface';
import { buildSupabaseTokenExtractionScript, isSupabaseDashboardPage } from '../utils/supabase-token-extractor';

export const supabaseBrowserProvider: OAuthProviderDefinition = {
  name: 'supabase-browser',
  scopes: [], // Not used for browser auth
  usePKCE: false, // Not used for browser auth
  clientId: 'browser-auth', // Placeholder

  // Token pattern is required but handled by browser auth mapping
  tokenEnvVarPattern: {
    accessToken: 'SUPABASE_ACCESS_TOKEN', // Maps to primary_token
  },

  // Browser-based authentication configuration
  browserAuthConfig: {
    enabled: true,
    loginUrl: 'https://supabase.com/dashboard/sign-in',
    workspacePattern: /supabase\.com\/dashboard\/project\/([a-zA-Z0-9-_]+)/,

    // Map browser tokens to environment variables
    tokenMapping: {
      primary: 'SUPABASE_ACCESS_TOKEN',
    },

    navigationRules: (url: string) => {
      // Only allow navigation to official Supabase domains
      try {
        const parsedUrl = new URL(url);
        // Allow "supabase.com", "app.supabase.com", and "*.supabase.com"
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

      // Check if we're on a Supabase dashboard page
      if (!isSupabaseDashboardPage(url)) {
        console.log('[Supabase Browser Auth] Not on dashboard page, skipping extraction');
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

        // Build and execute token extraction script
        const script = buildSupabaseTokenExtractionScript(projectRef);
        const result = await webContents.executeJavaScript(script);

        if (process.env.NODE_ENV === 'development') {
          console.log('[Supabase Browser Auth] Token extraction result:', {
            success: result.success,
            hasToken: !!result.accessToken,
            projectRef: result.projectRef,
            error: result.error,
          });
        }

        if (result.success && result.accessToken) {
          return {
            primary_token: result.accessToken,
            project_ref: result.projectRef,
            extracted_from: url,
          };
        } else {
          console.error('[Supabase Browser Auth] Token extraction failed:', result.error);
          return null;
        }
      } catch (error) {
        console.error('[Supabase Browser Auth] Token extraction failed:', error);
        return null;
      }
    },
  },

  discoveryConfig: {
    baseUrl: 'https://supabase.com',
    enabled: false, // Browser auth doesn't use OAuth discovery
  },

  metadata: {
    displayName: 'Supabase (Browser Auth)',
    documentationUrl: 'https://supabase.com/docs/guides/api/api-keys',
    supportsRefresh: false,
    notes: 'Direct browser authentication using personal access tokens. No OAuth app required.',
  },
};