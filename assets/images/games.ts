/**
 * Drinking Games Images
 * Visual guides for various drinking games
 */

export const games = {
  twentyOne: require('./games/Games - 21 (1).png'),
  twentyOne2: require('./games/Games - 21 (2).png'),
  anchorman: require('./games/Games - Anchorman.png'),
  arrogance: require('./games/Games - Arrogance.png'),
  baseball: require('./games/Games - Baseball.png'),
  beerPong: require('./games/Games - Beer Pong.png'),
  boatRace: require('./games/Games - Boat Race.png'),
  boatRace1: require('./games/Games - Boat Race 1.png'),
  buffaloClub: require('./games/Games - Buffalo Club.png'),
  centurion: require('./games/Games -  Centurion.png'),
  circleOfDeath: require('./games/Games -  Circle of Death.png'),
  civilWar: require('./games/Games - Civla War.png'),
  diceGames: require('./games/Games - Dice Games.png'),
  drinkWhileYouThink: require('./games/Games -  Drink While you Think (1).png'),
  drunkJenga: require('./games/Games - Drunk Jenga.png'),
  drunkJenga1: require('./games/Games - Drunk Jenga 1.png'),
  drunkJenga2: require('./games/Games - Drunk Jenga 2.png'),
  drunkUno: require('./games/Games - Drunk Uno.png'),
  flipCup: require('./games/Games - Flip Cup.png'),
  fuzzyDuck: require('./games/Games -  Fuzzy Duck.png'),
  fuzzyDuck1: require('./games/Games - Fuzzy Duck 1.png'),
  fuzzyDuck2: require('./games/Games - Fuzzy Duck 2.png'),
  kings: require('./games/Games - Kings.png'),
  kings1: require('./games/Games - Kings 1.png'),
  kingsCup: require('./games/Games - Kings Cup.png'),
  mostLikelyTo: require('./games/Games - Most Likely to.png'),
  neverHaveIEver: require('./games/Games - Never have i ever.png'),
  paranoia: require('./games/Games - Paranoia.png'),
  powerHour: require('./games/Games - Power hour.png'),
  quarters: require('./games/Games - Quaters.png'),
  rageCage: require('./games/Games - Rage Cage.png'),
  rideTheBus: require('./games/Games - Ride the Bus.png'),
  ringOfFire: require('./games/Games - Ring of Fire.png'),
  ringOfFire1: require('./games/Games -  Ring of Fire 1.png'),
  spoons: require('./games/Games - Spoons.png'),
  thumper: require('./games/Games - Thumper.png'),
  truthOrDare: require('./games/Games - Truth or Dare.png'),
} as const;

export type GameKey = keyof typeof games;
