
export default defineNuxtPlugin(async () => {
  // Initialize auth status (check if auth is enabled on server)
  const { init } = useAuth();
  await callOnce(init);

  addRouteMiddleware('global-auth', (to) => {
    // Get fresh auth state on every navigation
    const { isAuthenticated, isAdmin, role, siteAuthEnabled } = useAuth();

    console.log('[Middleware] Navigating to (path):', to.path);
    console.log('[Middleware] Auth State:', {
      isAuthenticated: isAuthenticated.value,
      role: role.value,
      isAdmin: isAdmin.value,
      siteAuthEnabled: siteAuthEnabled.value
    });

    // Allow login page
    if (to.path === '/login') return;

    // Check log access (ALWAYS strict)
    if (to.path.startsWith('/logs')) {
      if (!isAdmin.value) {
        console.warn('[Middleware] User attempts to access logs but is NOT admin. Current role:', role.value);
        // Redirect to login to allow user to enter Admin password (upgrade session)
        return navigateTo({
          path: '/login',
          query: {
            redirect: to.fullPath
          }
        });
      }
      console.log('[Middleware] Log access granted');
      return;
    }

    // Check generic authentication
    if (siteAuthEnabled.value && !isAuthenticated.value) {
      console.log('[Middleware] Not authenticated and site auth is ENABLED, redirecting to login');
      return navigateTo({
        path: '/login',
        query: {
          redirect: to.fullPath
        }
      });
    }
  }, { global: true })
})
