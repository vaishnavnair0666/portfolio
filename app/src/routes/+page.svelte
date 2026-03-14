<script lang="ts">
	import { onMount } from 'svelte';
	import { startWebGPU, engineAPI } from '$lib/gfx/webgpu';

	let canvas: HTMLCanvasElement;

	let locked = false;
	let dragging = false;
	let lastX = 0;
	let lastY = 0;

	let objects = 0;
	let selected = 0;

	const isMobile = navigator.maxTouchPoints > 0;

	function start(e: PointerEvent) {
		e.preventDefault();

		const el = e.currentTarget as HTMLElement;

		el.setPointerCapture(e.pointerId);

		dragging = true;
		lastX = e.clientX;
		lastY = e.clientY;

		if (!isMobile) {
			el.requestPointerLock();
		}
	}

	function move(e: PointerEvent) {
		if (!dragging) return;

		let dx;
		let dy;

		if (locked) {
			dx = e.movementX;
			dy = e.movementY;
		} else {
			dx = e.clientX - lastX;
			dy = e.clientY - lastY;
		}

		lastX = e.clientX;
		lastY = e.clientY;

		engineAPI?.orbit(dx * 0.005, dy * 0.005);
	}

	function end(e: PointerEvent) {
		dragging = false;

		const el = e.currentTarget as HTMLElement;
		el.releasePointerCapture(e.pointerId);

		if (!isMobile) {
			document.exitPointerLock();
		}
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

		interval = window.setInterval(() => {
			if (engineAPI) {
				objects = engineAPI.getObjectCount();
				selected = engineAPI.getSelectedCount();
			}
		}, 200);

		return () => {
			cleanup?.();
			document.removeEventListener('pointerlockchange', lockChange);
			clearInterval(interval);
		};
	});
</script>

<canvas bind:this={canvas} class="gfx-canvas"></canvas>

<main class="content ui">
	<h1>Vaishnav Nair</h1>

	<p class="tagline">Frontend / Systems Engineer</p>

	<p class="tech">Rust 🔷 WebAssembly 🔷 TypeScript 🔷 Docker 🔷 Linux</p>

	<p class="intro">
		Building web experiences using systems programming and modern browser technologies.
	</p>

	<div class="stats">
		Objects: {objects}
		Selected: {selected}
	</div>
	<div class="controls">
		<p>
			🔷 Drag cubes to move them, 🔷 Ctrl + click to multi-select, 🔷 Use the orbit pad to rotate
			the camera, 🔷 Scroll to zoom.
		</p>
	</div>
	<div class="buttons ui-interactive">
		<a href="https://github.com/vaishnavnair0666">GitHub</a>
		<a href="/resume.pdf">Resume</a>
	</div>

	<div class="palette ui-interactive">
		<button on:click={() => engineAPI.setColor(1, 0.4, 0.4)}>Red</button>
		<button on:click={() => engineAPI.setColor(0.4, 1, 0.4)}>Green</button>
		<button on:click={() => engineAPI.setColor(0.4, 0.4, 1)}>Blue</button>
		<button on:click={() => engineAPI.setColor(1, 1, 0.4)}>Yellow</button>
	</div>
	<div class="orbit-container ui-interactive">
		<div class="orbit-hint">Drag to rotate camera</div>

		<div
			class="orbit-pad"
			on:pointerdown={start}
			on:pointermove={move}
			on:pointerup={end}
			on:pointerleave={end}
			on:pointercancel={end}
		></div>
	</div>
</main>

<style>
	* {
		margin: 0;
		user-select: none;
		-webkit-user-select: none;
	}

	.gfx-canvas {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		z-index: 0;
		touch-action: none;
	}

	.ui {
		position: relative;
		z-index: 1;

		max-width: 48rem;
		margin: 5rem auto;
		padding: 0 1.25rem;

		font-family:
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			sans-serif;

		pointer-events: none;
	}

	.ui-interactive,
	.ui-interactive * {
		pointer-events: auto;
	}

	h1 {
		color: aliceblue;
		font-size: 2.5rem;
		margin-bottom: 1rem;
	}

	p {
		color: aliceblue;
	}

	.stats {
		color: aliceblue;
	}
	.controls {
		position: fixed;
		bottom: 20px;
		left: 20px;
		color: rgba(255, 255, 255, 0.7);
		font-size: 13px;
		pointer-events: none;
	}
	.orbit-container {
		position: fixed;
		bottom: 30px;
		right: 30px;

		display: flex;
		flex-direction: column;
		align-items: center;

		gap: 8px;
	}
	.orbit-hint {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.75);

		background: rgba(0, 0, 0, 0.35);
		backdrop-filter: blur(6px);

		padding: 4px 8px;
		border-radius: 5px;

		pointer-events: none;
	}
	.orbit-pad {
		width: 120px;
		height: 120px;

		border-radius: 10px;

		background: rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(6px);

		cursor: grab;

		user-select: none;
		-webkit-user-select: none;
		touch-action: none;

		display: flex;
		align-items: center;
		justify-content: center;

		border: 1px solid rgba(255, 255, 255, 0.15);
	}

	.orbit-pad:active {
		cursor: grabbing;
	}

	.palette button,
	.buttons a {
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border: none;
		padding: 8px 12px;
		margin-right: 6px;
		border-radius: 6px;
		cursor: pointer;
	}

	.palette button:hover,
	.buttons a:hover {
		background: rgba(255, 255, 255, 0.2);
	}
</style>
