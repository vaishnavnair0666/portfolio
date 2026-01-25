<script lang="ts">
	// Day 1: static, SSR-only content
</script>

<main>
	<h1>Your Name</h1>

	<p class="tagline">Engineering student focused on declarative systems, graphics, and web architecture.</p>

	<p class="resume">
		<a href="/resume.pdf" download> Download resume </a>
	</p>
</main>

<style>
	main {
		max-width: 48rem;
		margin: 5rem auto;
		padding: 0 1.25rem;
		font-family:
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			sans-serif;
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
