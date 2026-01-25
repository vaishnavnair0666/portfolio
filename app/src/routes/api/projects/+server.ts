import { json } from '@sveltejs/kit';
import { projects } from '$lib/projects';

export function GET() {
  return json(projects);
}

