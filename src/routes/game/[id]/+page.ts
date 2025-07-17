import type { PageLoad } from './$types';

// Pass route param to the page component; component loads the game from storage.
export const load: PageLoad = async ({ params }) => {
  return {
    id: params.id
  };
};
