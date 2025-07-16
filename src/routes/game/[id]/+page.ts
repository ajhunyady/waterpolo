// src/routes/game/[id]/+page.ts
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
  // just pass the id through; component will load from gameStore
  return { id: params.id };
};