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
