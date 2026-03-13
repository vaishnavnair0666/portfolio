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

	const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

	function start(e: PointerEvent) {
		e.preventDefault();

		const el = e.currentTarget as HTMLElement;

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

	function end() {
		dragging = false;

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

		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', end);

		interval = window.setInterval(() => {
			if (engineAPI) {
				objects = engineAPI.getObjectCount();
				selected = engineAPI.getSelectedCount();
			}
		}, 200);

		return () => {
			cleanup?.();

			document.removeEventListener('pointerlockchange', lockChange);
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', end);

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

	<div class="palette ui-interactive">
		<button on:click={() => engineAPI.setColor(1, 0.4, 0.4)}>Red</button>
		<button on:click={() => engineAPI.setColor(0.4, 1, 0.4)}>Green</button>
		<button on:click={() => engineAPI.setColor(0.4, 0.4, 1)}>Blue</button>
		<button on:click={() => engineAPI.setColor(1, 1, 0.4)}>Yellow</button>
	</div>

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
		<a href="#projects">View Projects</a>
		<a href="https://github.com/vaishnavnair0666">GitHub</a>
		<a href="/resume.pdf">Resume</a>
	</div>

	<div
		class="orbit-pad ui-interactive"
		on:pointerdown={start}
		on:pointermove={move}
		on:pointerup={end}
		on:pointerleave={end}
	></div>
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

		user-select: none;
		-webkit-user-select: none;
		touch-action: none;
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
