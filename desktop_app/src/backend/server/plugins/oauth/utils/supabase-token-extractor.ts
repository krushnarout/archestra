/**
 * Supabase Token Extraction Utilities
 *
 * Utilities for extracting Supabase authentication tokens from the browser
 */

interface SupabaseTokenExtractionResult {
  success: boolean;
  accessToken?: string;
  projectRef?: string;
  error?: string;
}

/**
 * Extract Supabase tokens from localStorage and cookies
 * This runs in the browser context
 */
export const SUPABASE_TOKEN_EXTRACTION_SCRIPT = `
  (function() {
    try {
      console.log('[Supabase Token Extraction] Starting token extraction...');
      console.log('[Supabase Token Extraction] Current URL:', window.location.href);
      
      // Try to extract project reference from URL
      let projectRef = '{{PROJECT_REF}}';
      console.log('[Supabase Token Extraction] Context project ref:', projectRef || 'none');
      
      if (!projectRef || projectRef === 'null') {
        const urlMatch = window.location.pathname.match(/\/dashboard\/project\/([a-zA-Z0-9-_]+)/);
        if (urlMatch) {
          projectRef = urlMatch[1];
          console.log('[Supabase Token Extraction] Extracted project ref from URL:', projectRef);
        }
      }
      
      // Try to extract access token from localStorage
      let accessToken = null;
      
      // Method 1: Check for Supabase session in localStorage
      try {
        const supabaseAuthKeys = Object.keys(localStorage).filter(key => 
          key.startsWith('sb-') && key.includes('-auth-token')
        );
        
        for (const key of supabaseAuthKeys) {
          const authData = localStorage.getItem(key);
          if (authData) {
            const parsed = JSON.parse(authData);
            if (parsed.access_token) {
              accessToken = parsed.access_token;
              console.log('[Supabase Token Extraction] Found access token in localStorage key:', key);
              break;
            }
          }
        }
      } catch (e) {
        console.log('[Supabase Token Extraction] Error checking localStorage:', e.message);
      }
      
      // Method 2: Check for personal access token in user settings/profile
      if (!accessToken) {
        try {
          // Look for any stored personal access tokens
          const personalTokenKeys = Object.keys(localStorage).filter(key => 
            key.includes('personal') || key.includes('token') || key.includes('pat')
          );
          
          for (const key of personalTokenKeys) {
            const tokenData = localStorage.getItem(key);
            if (tokenData && tokenData.startsWith('sbp_')) {
              accessToken = tokenData;
              console.log('[Supabase Token Extraction] Found personal access token in localStorage key:', key);
              break;
            }
          }
        } catch (e) {
          console.log('[Supabase Token Extraction] Error checking for personal tokens:', e.message);
        }
      }
      
      // Method 3: Check cookies for session tokens
      if (!accessToken) {
        try {
          const cookies = document.cookie.split(';');
          for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name && (name.includes('supabase') || name.includes('sb-')) && value) {
              try {
                const decoded = decodeURIComponent(value);
                if (decoded.includes('access_token')) {
                  const tokenMatch = decoded.match(/"access_token"\s*:\s*"([^"]+)"/);
                  if (tokenMatch) {
                    accessToken = tokenMatch[1];
                    console.log('[Supabase Token Extraction] Found access token in cookie:', name);
                    break;
                  }
                }
              } catch (e) {
                // Skip invalid cookies
              }
            }
          }
        } catch (e) {
          console.log('[Supabase Token Extraction] Error checking cookies:', e.message);
        }
      }
      
      if (!accessToken) {
        return { success: false, error: 'No access token found in localStorage or cookies' };
      }
      
      return { 
        success: true, 
        accessToken: accessToken, 
        projectRef: projectRef || null 
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  })();
`;

/**
 * Build Supabase token extraction script with project reference
 */
export function buildSupabaseTokenExtractionScript(projectRef: string | null): string {
  return SUPABASE_TOKEN_EXTRACTION_SCRIPT.replace('{{PROJECT_REF}}', projectRef || 'null');
}

/**
 * Check if the current URL is a Supabase dashboard page
 */
export function isSupabaseDashboardPage(url: string): boolean {
  return url.includes('supabase.com/dashboard') || url.includes('app.supabase.com');
}

/**
 * Extract project reference from Supabase URL
 */
export function extractProjectRefFromUrl(url: string): string | null {
  const match = url.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Build Supabase dashboard URL for a specific project
 */
export function buildSupabaseDashboardUrl(projectRef: string): string {
  return `https://supabase.com/dashboard/project/${projectRef}`;
}