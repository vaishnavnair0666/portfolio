<script lang="ts">
	export let data: {
		projects: {
			id: string;
			title: string;
			summary: string;
			tags: string[];
		}[];
	};
</script>

<main>
	<h1>Vaishnav Nair</h1>

	<p class="tagline">
		Engineering student focused on declarative systems, graphics, and web architecture.
	</p>

	<p class="resume">
		<a href="/resume.pdf" download> Download resume </a>
	</p>

	<section class="projects">
		<h2>Projects</h2>

		<ul>
			{#each data.projects as project}
				<li>
					<h3>{project.title}</h3>
					<p>{project.summary}</p>
					<small>{project.tags.join(' · ')}</small>
				</li>
			{/each}
		</ul>
	</section>
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
	.projects {
		margin-top: 4rem;
	}

	.projects ul {
		list-style: none;
		padding: 0;
	}

	.projects li {
		margin-bottom: 2rem;
	}

	.projects h3 {
		margin-bottom: 0.25rem;
	}
</style>
