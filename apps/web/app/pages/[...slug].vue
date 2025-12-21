<template>
  <v-container class="fill-height justify-center">
    <v-card class="text-center pa-6" elevation="2" max-width="500">
      <v-card-text>
        <v-icon color="warning" size="64" class="mb-4">mdi-alert-circle-outline</v-icon>
        <h1 class="text-h4 font-weight-bold mb-2">404 Not Found</h1>
        <p class="text-body-1 text-medium-emphasis mb-6">
          Oops! The page you are looking for does not exist.
        </p>
        <div class="text-caption text-disabled mb-4">
          Route: {{ route.fullPath }}
        </div>
      </v-card-text>
      <v-card-actions class="justify-center">
        <v-btn color="primary" variant="flat" to="/" prepend-icon="mdi-home">
          Go Home
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
const route = useRoute()
const event = useRequestEvent()

if (event) {
  setResponseStatus(event, 404)
}
</script>
