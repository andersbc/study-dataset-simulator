
export default defineNuxtPlugin((nuxtApp) => {
  const { token } = useAuth();

  const headers = computed(() => {
    if (token.value) {
      return { 'X-Sim-Auth': token.value };
    }
    return {};
  });

  // Global defaults for $fetch
  const $fetchOriginal = globalThis.$fetch;

  // We can't really overwrite globalThis.$fetch easily safely in SSR/Hydration mismatch world.
  // Better to use `useFetch` defaults or interceptors if available.
  // But standard way in Nuxt 3 is often wrapping or using custom composable.
  // HOWEVER, we can register an interceptor on `ofetch` (the underlying lib).

  // Actually, simplest way is to overwrite defaults?
  // Let's create a wrapper `useApi` or just configure global fetch if possible.

  // Nuxt provides `apiBase` so we can make a custom fetcher.

  const api = $fetch.create({
    baseURL: nuxtApp.$config.public.apiBase,
    onRequest({ options }) {
      console.log('[API Plugin] Requesting:', options.method, options.baseURL);
      console.log('[API Plugin] Current Token:', token.value);
      if (token.value) {
        options.headers = {
          ...options.headers,
          'X-Sim-Auth': token.value
        }
        console.log('[API Plugin] Auth header set.');
      } else {
        console.warn('[API Plugin] No token found, sending request without auth.');
      }
    }
  });

  // Provide it
  return {
    provide: {
      api
    }
  }
})

declare module '#app' {
  interface NuxtApp {
    $api: typeof globalThis.$fetch
  }
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $api: typeof globalThis.$fetch
  }
}
