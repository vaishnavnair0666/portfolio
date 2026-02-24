<script lang="ts">
	import { onMount } from 'svelte';
	import { startWebGPU } from '$lib/gfx/webgpu';

	let canvas: HTMLCanvasElement;

	onMount(() => {
		let cleanup: (() => void) | undefined;

		startWebGPU(canvas)
			.then((fn) => (cleanup = fn))
			.catch(console.error);

		return () => {
			cleanup?.();
		};
	});
</script>

<canvas bind:this={canvas} class="gfx-canvas"></canvas>
<main class="content">
	<h1>Vaishnav Nair</h1>

	<p class="tagline">
		Engineering student focused on declarative systems, graphics, and web architecture.
	</p>

	<p class="resume">
		<a href="/resume.pdf" download> Download resume </a>
	</p>
</main>

<style>
	.content {
		z-index: 1;
		max-width: 48rem;
		margin: 5rem auto;
		padding: 0 1.25rem;
		font-family:
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			sans-serif;
	}
	.gfx-canvas {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
    z-index: -1;
	}
	h1 {
		font-size: 2.5rem;
		margin-bottom: 1rem;
	}

	.tagline {
		font-size: 1.125rem;
		line-height: 1.6;
		margin-bottom: 2rem;
		color: #444;
	}

	.resume a {
		font-weight: 500;
		text-decoration: underline;
	}
</style>
