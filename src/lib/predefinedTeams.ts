import { v4 as uuid } from 'uuid';
import type { Player } from './types';

export interface TeamTemplate {
  id: string;
  name: string;
  players: { number: number; name: string }[];
}

export const PREDEFINED_TEAMS: TeamTemplate[] = [
  {
    id: 'sample',
    name: 'Sample Team',
    players: Array.from({ length: 13 }).map((_, i) => ({
      number: i + 1,
      name: `Player ${i + 1}`
    }))
  }
];

export function cloneTemplatePlayers(template: TeamTemplate): Player[] {
  return template.players.map((p) => ({ id: uuid(), number: p.number, name: p.name }));
}
