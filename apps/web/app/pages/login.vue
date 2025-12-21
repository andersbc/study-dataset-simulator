<template>
  <div class="fill-height d-flex align-center justify-center bg-surface-variant">
    <v-card width="100%" max-width="400" class="pa-6 rounded-lg elevation-4">
      <div class="text-center mb-6">
        <AppLogo class="mx-auto mb-4" height="80" width="80" />
        <h1 class="text-h5 text-sm-h4 font-weight-bold">Study Dataset Simulator</h1>
      </div>

      <v-card-text class="pa-0">
        <p class="mb-6 text-center text-medium-emphasis">
          <template v-if="isTargetingAdmin">
            <span class="d-block text-error font-weight-bold mb-1">Administration Access</span>
            <span>Restricted area. Please enter admin password.</span>
            <br>
            <NuxtLink to="/login" class="text-caption text-decoration-underline text-secondary">
              Return to Guest Login
            </NuxtLink>
          </template>
          <template v-else>
            <span v-if="siteAuthEnabled">Please enter the password to continue.</span>
            <span v-else>
              Login optional. Full access enabled.
              <br>
              <v-btn to="/" variant="text" color="success" class="mt-2 mb-1 font-weight-bold"
                prepend-icon="mdi-arrow-right">
                Go to site (no login)
              </v-btn>
              <br>
              <NuxtLink to="/login?redirect=/admin" class="text-caption text-decoration-underline text-primary">
                Login as Admin
              </NuxtLink>
            </span>
          </template>
        </p>
        <v-text-field v-model="password" label="Password" type="password" variant="outlined" placeholder="••••••••"
          prepend-inner-icon="mdi-lock" :error-messages="error" @keyup.enter="handleLogin"></v-text-field>
      </v-card-text>

      <v-card-actions class="pa-0 mt-4">
        <v-btn block color="primary" size="large" variant="flat" @click="handleLogin" :loading="loading"
          class="text-none font-weight-bold">
          Access Simulator
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'blank'
})

const password = ref('')
const error = ref('')
const loading = ref(false)
import { useAuth } from '@/composables/useAuth'

const { login, isAdmin, siteAuthEnabled } = useAuth()
const router = useRouter()
const route = useRoute()

const isTargetingAdmin = computed(() => {
  const r = route.query.redirect as string
  return r && (r.startsWith('/admin') || r.startsWith('/logs'))
})

async function handleLogin() {
  if (!password.value) {
    error.value = 'Password is required'
    return
  }

  loading.value = true
  error.value = ''

  const success = await login(password.value)
  if (success) {
    // Redirect to home or previous page
    const route = useRoute()
    const redirectPath = (route.query.redirect as string) || '/'

    console.log('[Login] Route query:', route.query)
    console.log('[Login] Resolved redirectPath:', redirectPath)

    // Check if user has permission for the redirect path
    if ((redirectPath.startsWith('/logs') || redirectPath.startsWith('/admin')) && !isAdmin.value) {
      error.value = 'Admin password required for access.'
      loading.value = false
      return
    }

    console.log('[Login] Navigating to:', redirectPath)
    await navigateTo(redirectPath)
  } else {
    error.value = 'Invalid password'
  }
  loading.value = false
}
</script>
