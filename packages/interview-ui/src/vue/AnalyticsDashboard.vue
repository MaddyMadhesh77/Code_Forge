<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { InterviewAnalyticsDashboard } from '@codeforge/shared';

const props = withDefaults(
  defineProps<{
    apiBaseUrl: string;
    days?: number;
  }>(),
  {
    days: 14,
  },
);

const loading = ref(false);
const error = ref('');
const data = ref<InterviewAnalyticsDashboard | null>(null);

onMounted(async () => {
  loading.value = true;
  error.value = '';
  try {
    const response = await fetch(`${props.apiBaseUrl}/interviews/analytics/dashboard?days=${props.days}`);
    if (!response.ok) {
      throw new Error(`Failed to load analytics (${response.status})`);
    }
    data.value = (await response.json()) as InterviewAnalyticsDashboard;
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="card">
    <p v-if="loading">Loading analytics...</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="data">
      <h3>Interview Analytics ({{ data.rangeDays }}d)</h3>
      <p>Total sessions: {{ data.summary.totalSessions }}</p>
      <p>Completion rate: {{ (data.summary.completionRate * 100).toFixed(1) }}%</p>
      <p>Average duration: {{ data.summary.avgDurationMinutes }} min</p>
      <p>Total submissions: {{ data.summary.totalSubmissions }}</p>
    </template>
    <p v-else>No analytics data yet.</p>
  </section>
</template>

<style scoped>
.card {
  border: 1px solid #ddd;
  border-radius: 12px;
  padding: 12px;
}
.error {
  color: #9f2222;
}
</style>
