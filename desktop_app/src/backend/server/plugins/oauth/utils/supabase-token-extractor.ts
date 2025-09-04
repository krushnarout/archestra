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
      
      const hostname = window.location.hostname;
      if (!hostname.includes('supabase.com')) {
        return { success: false, error: 'Not on Supabase domain' };
      }
        
      return { success: true };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  })();
`;

/**
 * Build Supabase token extraction script with project reference
 */
export function buildSupabaseTokenExtractionScript(projectRef: string | null): string {
  return SUPABASE_TOKEN_EXTRACTION_SCRIPT;
}

/**
 * Check if the current URL is a Supabase dashboard page
 */
export function isSupabaseDashboardPage(url: string): boolean {
  return url.includes('supabase.com/dashboard') || url.includes('app.supabase.com');
}

/**
 * Check if URL is Supabase login/signin page
 */
export function isSupabaseLoginPage(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.hostname.includes('supabase.com') &&
      (parsedUrl.pathname.includes('/sign-in') ||
        parsedUrl.pathname.includes('/login') ||
        parsedUrl.pathname.includes('/auth') ||
        parsedUrl.pathname === '/' ||
        parsedUrl.pathname.includes('/signin'))
    );
  } catch {
    return false;
  }
}

/**
 * Check if URL is an authenticated Supabase dashboard page
 */
export function isSupabaseAuthenticatedPage(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.hostname.includes('supabase.com') &&
      (parsedUrl.pathname.startsWith('/dashboard/project/') ||
        parsedUrl.pathname.startsWith('/dashboard/projects') ||
        parsedUrl.pathname.startsWith('/dashboard/account') ||
        parsedUrl.pathname.startsWith('/dashboard/settings'))
    );
  } catch {
    return false;
  }
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
