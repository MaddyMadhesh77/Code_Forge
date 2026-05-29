<script setup lang="ts">
import { ref } from 'vue';

const props = withDefaults(
  defineProps<{
    mode?: 'webcam' | 'screen';
    withAudio?: boolean;
  }>(),
  {
    mode: 'webcam',
    withAudio: true,
  },
);

const emit = defineEmits<{
  recorded: [blob: Blob];
}>();

const recorder = ref<MediaRecorder | null>(null);
const stream = ref<MediaStream | null>(null);
const chunks = ref<Blob[]>([]);
const recording = ref(false);
const error = ref('');

async function start() {
  error.value = '';
  try {
    stream.value =
      props.mode === 'screen'
        ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: props.withAudio })
        : await navigator.mediaDevices.getUserMedia({ video: true, audio: props.withAudio });

    recorder.value = new MediaRecorder(stream.value, { mimeType: 'video/webm;codecs=vp9,opus' });
    chunks.value = [];

    recorder.value.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        chunks.value.push(event.data);
      }
    };

    recorder.value.onstop = () => {
      emit('recorded', new Blob(chunks.value, { type: 'video/webm' }));
      stream.value?.getTracks().forEach((track) => track.stop());
    };

    recorder.value.start(300);
    recording.value = true;
  } catch (err) {
    error.value = (err as Error).message;
  }
}

function stop() {
  recorder.value?.stop();
  recording.value = false;
}
</script>

<template>
  <section class="card">
    <h3>{{ mode === 'screen' ? 'Screen Recorder' : 'Webcam Recorder' }}</h3>
    <div class="row">
      <button :disabled="recording" @click="start">Start</button>
      <button :disabled="!recording" @click="stop">Stop</button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<style scoped>
.card {
  border: 1px solid #ddd;
  border-radius: 12px;
  padding: 12px;
}
.row {
  display: flex;
  gap: 8px;
}
.error {
  color: #9f2222;
}
</style>
