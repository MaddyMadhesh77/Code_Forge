<script setup lang="ts">
import { computed, ref } from 'vue';
import VideoRecorder from './VideoRecorder.vue';

const props = defineProps<{
  sessionId: string;
  apiBaseUrl: string;
  defaultLanguage?: string;
}>();

const language = ref(props.defaultLanguage ?? 'typescript');
const code = ref('// Write solution here');
const reviewResult = ref<any>(null);
const complexity = ref<any>(null);
const uploadMessage = ref('');

const base = computed(() => `${props.apiBaseUrl}/interviews/${props.sessionId}`);

async function runReview() {
  const response = await fetch(`${base.value}/code-review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: code.value, language: language.value }),
  });
  reviewResult.value = await response.json();
}

async function runComplexity() {
  const response = await fetch(`${base.value}/complexity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: code.value }),
  });
  complexity.value = await response.json();
}

async function onRecorded(blob: Blob, source: 'webcam' | 'screen') {
  const fileName = `${props.sessionId}-${source}-${Date.now()}.webm`;
  const response = await fetch(`${base.value}/recordings/artifacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName,
      mimeType: blob.type || 'video/webm',
      sizeBytes: blob.size,
      source,
    }),
  });

  if (!response.ok) {
    uploadMessage.value = 'Recording captured but metadata upload failed.';
    return;
  }

  uploadMessage.value = `Recording metadata saved (${source}, ${Math.round(blob.size / 1024)} KB).`;
}
</script>

<template>
  <main class="layout">
    <section class="card">
      <h2>Interview Workspace</h2>
      <label>
        Language
        <select v-model="language">
          <option value="typescript">TypeScript</option>
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
        </select>
      </label>
      <textarea v-model="code" rows="14" class="editor" />
      <div class="row">
        <button @click="runReview">Run AI Code Review</button>
        <button @click="runComplexity">Analyze Complexity</button>
      </div>
    </section>

    <section class="grid">
      <VideoRecorder mode="webcam" @recorded="(blob) => onRecorded(blob, 'webcam')" />
      <VideoRecorder mode="screen" :with-audio="false" @recorded="(blob) => onRecorded(blob, 'screen')" />
    </section>

    <p v-if="uploadMessage">{{ uploadMessage }}</p>

    <section v-if="reviewResult" class="card">
      <h3>AI Review Score: {{ reviewResult.score }}</h3>
      <ul>
        <li v-for="(issue, idx) in reviewResult.issues" :key="idx">
          [{{ issue.severity }}] {{ issue.category }}: {{ issue.message }}
        </li>
      </ul>
    </section>

    <section v-if="complexity" class="card">
      <h3>Complexity</h3>
      <p>Time: {{ complexity.timeComplexity }}</p>
      <p>Space: {{ complexity.spaceComplexity }}</p>
      <p>Confidence: {{ complexity.confidence }}</p>
    </section>
  </main>
</template>

<style scoped>
.layout {
  display: grid;
  gap: 12px;
}
.card {
  border: 1px solid #ddd;
  border-radius: 12px;
  padding: 12px;
}
.grid {
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr 1fr;
}
.row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.editor {
  width: 100%;
  margin-top: 8px;
  font-family: monospace;
}
</style>
