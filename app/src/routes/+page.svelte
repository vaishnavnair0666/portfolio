<script lang="ts">
	import { onMount } from 'svelte';
	import { startWebGPU, engineAPI } from '$lib/gfx/webgpu';

	let canvas: HTMLCanvasElement;

	let locked = false;
	let objects = 0;
	let selected = 0;

	function start(e: PointerEvent) {
		const el = e.currentTarget as HTMLElement;
		el.requestPointerLock();
	}

	function move(e: MouseEvent) {
		if (!locked) return;

		const dx = e.movementX;
		const dy = e.movementY;

		engineAPI?.orbit(dx * 0.005, dy * 0.005);
	}

	function end() {
		document.exitPointerLock();
	}

	onMount(() => {
		let cleanup: (() => void) | undefined;
		let interval: number;

		startWebGPU(canvas)
			.then((fn) => (cleanup = fn))
			.catch(console.error);

		function lockChange() {
			locked = document.pointerLockElement !== null;
		}

		document.addEventListener('pointerlockchange', lockChange);
		window.addEventListener('mousemove', move);
		window.addEventListener('mouseup', end);

		interval = window.setInterval(() => {
			if (engineAPI) {
				objects = engineAPI.getObjectCount();
				selected = engineAPI.getSelectedCount();
			}
		}, 200);

		return () => {
			cleanup?.();

			document.removeEventListener('pointerlockchange', lockChange);
			window.removeEventListener('mousemove', move);
			window.removeEventListener('mouseup', end);

			clearInterval(interval);
		};
	});
</script>

<canvas bind:this={canvas} class="gfx-canvas"></canvas>
<main class="content">
	<h1>Vaishnav Nair</h1>

	<p class="tagline">Frontend / Systems Engineer</p>

	<p class="tech">Rust • WebAssembly • TypeScript • Docker • Linux</p>

	<p class="intro">
		Building web experiences using systems programming and modern browser technologies.
	</p>
	<div class="palette">
		<button on:click={() => engineAPI.setColor(1, 0.4, 0.4)}>Red</button>

		<button on:click={() => engineAPI.setColor(0.4, 1, 0.4)}>Green</button>

		<button on:click={() => engineAPI.setColor(0.4, 0.4, 1)}>Blue</button>

		<button on:click={() => engineAPI.setColor(1, 1, 0.4)}>Yellow</button>
	</div>
	<div class="stats">
		Objects: {objects}
		Selected: {selected}
	</div>
	<div class="buttons">
		<a href="#projects">View Projects</a>
		<a href="https://github.com/vaishnavnair0666">GitHub</a>
		<a href="/resume.pdf">Resume</a>
	</div>
	<div
		class="orbit-pad"
		on:pointerdown={start}
		on:pointermove={move}
		on:pointerup={end}
		on:pointerleave={end}
	></div>
</main>

<style>
	h1 {
		color: aliceblue;
	}
	p {
		color: aliceblue;
	}
	.stats {
		color: aliceblue;
	}
	.orbit-pad {
		position: fixed;
		bottom: 30px;
		right: 30px;

		width: 120px;
		height: 120px;

		border-radius: 12px;
		background: rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(6px);

		cursor: grab;
	}
	.orbit-pad:active {
		cursor: grabbing;
	}
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
		color: aliceblue;
	}
</style>
