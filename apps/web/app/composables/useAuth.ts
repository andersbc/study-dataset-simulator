
export const useAuth = () => {
  const token = useCookie<string | null>('sim_auth_token');
  const role = useCookie<string | null>('sim_auth_role');
  const config = useRuntimeConfig();

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => role.value === 'admin');

  const login = async (password: string) => {
    // Clear existing state first
    token.value = null;
    role.value = null;

    console.log('[useAuth] Attempting login with password length:', password.length);
    try {
      const apiBase = import.meta.server ? config.serverApiBase : config.public.apiBase;
      const response = await $fetch<{ valid: boolean, role: string | null }>(`${apiBase}/auth/validate`, {
        method: 'POST',
        body: { password }
      });
      console.log('[useAuth] API response:', response);

      const { valid, role: userRole } = response;

      if (valid && userRole) {
        console.log('[useAuth] Login successful, setting token');
        token.value = password;
        role.value = userRole;
        return true;
      }
      console.warn('[useAuth] Login invalid according to API');
      return false;
    } catch (e) {
      console.error('[useAuth] Login error:', e);
      return false;
    }
  };

  const logout = () => {
    token.value = null;
    role.value = null;
    navigateTo('/login');
  };

  const siteAuthEnabled = useState('siteAuthEnabled', () => true);

  const init = async () => {
    try {
      const apiBase = import.meta.server ? config.serverApiBase : config.public.apiBase;
      const { siteAuthEnabled: enabled } = await $fetch<{ siteAuthEnabled: boolean }>(`${apiBase}/auth/status`);
      siteAuthEnabled.value = enabled;
      console.log('[useAuth] Site auth enabled:', enabled);
    } catch (e) {
      console.error('[useAuth] Failed to check auth status:', e);
    }
  };

  return {
    token,
    role,
    isAuthenticated,
    isAdmin,
    siteAuthEnabled,
    login,
    logout,
    init
  };
};
