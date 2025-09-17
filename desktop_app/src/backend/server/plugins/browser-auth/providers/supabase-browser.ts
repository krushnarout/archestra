import { BrowserAuthProviderDefinition } from '../provider-interface';
import { buildSupabaseTokenExtractionScript, isSupabaseTokenPage } from '../utils/supabase-token-extractor';

export const supabaseBrowserProvider: BrowserAuthProviderDefinition = {
  name: 'supabase-browser',

  // Browser-based authentication configuration
  browserAuthConfig: {
    enabled: true,
    loginUrl: 'https://supabase.com/dashboard/account/tokens',

    // Map browser tokens to environment variables
    tokenMapping: {
      primary: 'SUPABASE_ACCESS_TOKEN',
    },

    navigationRules: (url: string) => {
      // Only allow navigation to official Supabase domains
      try {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname;
        
        // Allow "supabase.com", "app.supabase.com", and "*.supabase.com"
        return (
          hostname === 'supabase.com' ||
          hostname === 'app.supabase.com' ||
          (hostname.endsWith('.supabase.com') && hostname.length > '.supabase.com'.length)
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

      // Only try to extract on Supabase pages
      if (!isSupabaseTokenPage(url)) {
        console.log('[Supabase Browser Auth] Not a Supabase dashboard page, skipping token extraction');
        return null;
      }

      console.log('[Supabase Browser Auth] On Supabase dashboard page, extracting tokens...');

      try {
        // Execute the token extraction script (now localStorage-based like Slack)
        const extractionScript = buildSupabaseTokenExtractionScript();
        const result = await webContents.executeJavaScript(extractionScript);

        console.log('[Supabase Browser Auth] Token extraction result:', {
          success: result.success,
          hasAccessToken: !!result.accessToken,
          error: result.error,
        });

        if (result.success && result.accessToken) {
          // Log success
          console.log('[Supabase Browser Auth] Successfully extracted access token');

          // Return proper BrowserTokenResponse
          return {
            primary_token: result.accessToken,
            user_id: result.userId,
          };
        }

        // Log the error for debugging
        if (!result.success) {
          console.error('[Supabase Browser Auth] Token extraction failed:', result.error);
        }

        return null;
      } catch (scriptError) {
        console.error('[Supabase Browser Auth] Script execution error:', scriptError);
        return null;
      }
    },
  },

  metadata: {
    displayName: 'Supabase (Browser Auth)',
    documentationUrl: 'https://supabase.com/docs/guides/platform/access-tokens',
    notes: 'Direct browser authentication using personal access tokens from Supabase dashboard. Navigate to the tokens page and copy your access token.',
  },
};