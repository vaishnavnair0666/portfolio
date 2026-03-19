<script lang="ts">
	import { onMount } from 'svelte';
	import { startWebGPU, engineAPI } from '$lib/gfx/webgpu';
	let showControls = false;
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
	<div class="controlsHint">
		<p>
			🔷 Drag cubes to move them, 🔷 Ctrl + click to multi-select, 🔷 Use the orbit pad to rotate
			the camera, 🔷 Scroll to zoom.
		</p>
	</div>
	<div class="buttons ui-interactive">
		<a href="https://github.com/vaishnavnair0666">GitHub</a>
		<a href="/resume.pdf">Resume</a>
	</div>

	<button class="tool-toggle ui-interactive" on:click={() => (showControls = !showControls)}>
		⚙
	</button>
	{#if showControls}
		<div class="tool-panel ui-interactive">
			<h3>Controls</h3>

			<div class="control-group">
				<label class="color-button">
					Pick Color
					<input
						type="color"
						on:input={(e) => {
							const input = e.target as HTMLInputElement;
							const hex = input.value;

							const r = parseInt(hex.slice(1, 3), 16) / 255;
							const g = parseInt(hex.slice(3, 5), 16) / 255;
							const b = parseInt(hex.slice(5, 7), 16) / 255;

							engineAPI?.setColor(r, g, b);
						}}
					/>
				</label>
			</div>

			<div class="control-group">
				<button on:click={() => engineAPI.moveY(0.3)}>⬆️ Raise</button>
				<button on:click={() => engineAPI.moveY(-0.3)}>⬇️ Lower</button>
			</div>
		</div>
	{/if}
	<div class="orbit-container ui-interactive">
		<div class="orbit-hint">Drag to rotate camera</div>

		<div
			class="orbit-pad"
			on:pointerdown={start}
			on:pointermove={move}
			on:pointerup={end}
			on:pointerleave={end}
			on:pointercancel={end}
		>
			<div class="orbit-icon">🔄</div>
		</div>
	</div>
</main>

<style>
	* {
		margin: 0;
		user-select: none;
		-webkit-user-select: none;
	}
	.content {
		z-index: 1;
		max-width: 48rem;
		margin: 5rem auto;
		padding: 0 1.25rem;

		display: flex;
		flex-direction: column;
		gap: 16px;
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
		color: #050505;
		font-size: 2.5rem;
		margin-bottom: 1rem;
	}

	p {
		color: #050505;
	}

	.stats {
		font-size: 14px;
		color: #050505;
	}
	.controlsHint {
		position: fixed;
		bottom: 20px;
		left: 20px;
		color: rgba(25, 25, 25, 0.7);
		font-size: 13px;
		pointer-events: none;
	}
	/* .controls { */
	/* 	pointer-events: auto; */
	/* } */
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

		background: rgba(4, 2, 3, 0.35);
		backdrop-filter: blur(6px);

		padding: 4px 8px;
		border-radius: 5px;

		pointer-events: none;
	}
	.orbit-pad {
		width: 120px;
		height: 120px;
		border-radius: 10px;
		background: rgba(023, 042, 003, 0.08);
		backdrop-filter: blur(6px);
		cursor: grab;
		user-select: none;
		-webkit-user-select: none;
		touch-action: none;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid rgba(042, 69, 67, 0.15);
	}

	.orbit-pad:active {
		cursor: grabbing;
	}
	.orbit-icon {
		color: rgba(255, 255, 255, 0.8);
		font-size: 28px;
		pointer-events: none;
	}
	.tool-toggle {
		position: fixed;
		top: 20px;
		right: 20px;
		z-index: 10;

		background: rgba(255, 255, 255, 0.1);
		border: none;
		color: black;
		padding: 10px 14px;
		border-radius: 8px;
		cursor: pointer;
		backdrop-filter: blur(10px);
	}

	.tool-panel {
		position: fixed;
		top: 70px;
		right: 20px;

		display: flex;
		flex-direction: column;
		gap: 12px;

		background: rgba(20, 20, 25, 0.7);
		backdrop-filter: blur(12px);

		padding: 14px;
		border-radius: 10px;

		width: 180px;
	}

	.control-group {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.tool-panel button,
	.color-button {
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border: none;
		padding: 8px 12px;
		border-radius: 6px;
		cursor: pointer;
		font-size: 13px;
	}

	.tool-panel button:hover,
	.color-button:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.color-button input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	@media (max-width: 768px) {
		.content {
			margin: 2rem auto;
			padding: 0 1rem;
		}
		h1 {
			font-size: 2rem;
		}
		.tagline {
			font-size: 1rem;
		}
		.tech {
			font-size: 0.9rem;
		}
		.orbit-pad {
			width: 150px;
			height: 150px;
		}
		.buttons {
			display: flex;
			flex-direction: column;
			gap: 10px;
		}
		.buttons a {
			text-align: center;
		}
		.controlsHint {
			font-size: 12px;
		}
		.tool-panel {
			right: 10px;
			bottom: 60px;
			width: 160px;
		}

		.tool-toggle {
			right: 10px;
			bottom: 10px;
		}
	}
</style>
