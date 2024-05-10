export interface MapJson {
  url?: string;
  locked: boolean;
  theEnd?: boolean;
  ground: Record<string, (string | number)[]>;
  trigger: Record<string, (string | number)[]>;
  bonus: Record<string, (string | number)[]>;
  key: Record<string, (string | number)[]>;
  troll: Record<string, any>;
  door?: Record<string, any>;
  rock?: Record<string, any>;
  human?: Record<string, any>;
  water?: Record<string, any>;
  button?: Record<string, any>;
  gate?: Record<string, any>;
  overlay?: string;
  goldCity?: boolean;
  pizza?: boolean;
  hell?: boolean;
  hasCat?: boolean;
  hasSnail?: boolean;
  hasCrab?: boolean;
  hasYellowCreature?: boolean;
  hasSlime?: boolean;
  autoNext?: boolean;
  redVelvet?: boolean;
}
