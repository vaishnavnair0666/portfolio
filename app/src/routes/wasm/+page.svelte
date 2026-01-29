<script lang="ts">
  import { onMount } from 'svelte';
  import { initWasm } from '$lib/gfx/wasm';

  onMount(async () => {
    const { update, uniforms } = await initWasm();

    const start = performance.now();

    function loop(t: number) {
      update((t - start) * 0.001);
      console.log('time from rust:', uniforms[0]);
      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
  });
</script>

<h1>WASM Engine Runtime Test</h1>

