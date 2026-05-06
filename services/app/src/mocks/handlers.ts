import { authHandlers } from '@/features/auth/mocks/handlers';
import { userHandlers } from '@/features/user/mocks/handlers';

// On centralise ici tous les handlers de toutes nos features
// C'est ici que tu ajouteras plus tard : [...authHandlers, ...userHandlers, ...wikiHandlers]
export const handlers = [
  ...authHandlers,
  ...userHandlers,
  // ...wikiHandlers,
];
