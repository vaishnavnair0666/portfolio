export type Project = {
  id: string;
  title: string;
  summary: string;
  tags: string[];
};

export const projects: Project[] = [
  {
    id: 'graphics-playground',
    title: 'Graphics & Shader Playground',
    summary:
      'Interactive experiments with shaders, animations, and procedural visuals.',
    tags: ['graphics', 'webgl', 'rust']
  },
  {
    id: 'systems-notes',
    title: 'Systems & Architecture Notes',
    summary:
      'Notes and write-ups on containers, Nix, and backend architecture.',
    tags: ['systems', 'backend', 'nix']
  }
];

