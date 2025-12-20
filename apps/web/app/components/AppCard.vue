<template>
  <v-card class="mb-6">
    <v-card-title class="py-6 px-6" v-if="title || $slots.title">
      <slot name="title">
        <div class="text-h5 font-weight-medium">{{ title }}</div>
      </slot>
    </v-card-title>

    <v-card-text class="px-6 pb-6">
      <slot></slot>
    </v-card-text>

    <v-card-actions v-if="$slots.actions" class="px-6 pb-8 pt-0">
      <slot name="actions"></slot>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>
