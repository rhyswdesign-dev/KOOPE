/**
 * Drinking Games - Full Write-ups
 * Complete rules, equipment, setup, and warnings for each game.
 * Used by GameDetailsScreen for detailed game views.
 */

import { games } from '../../assets/images/games';

export interface GameEquipment {
  icon: string; // Feather icon name
  title: string;
}

export interface GameSetupStep {
  icon: string;
  text: string;
}

export interface GameWarning {
  text: string;
}

export interface GameWriteup {
  id: string;
  title: string;
  origin: string;
  players: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  drinkingStyle: string;
  image: any;
  description: string;
  equipment: GameEquipment[];
  setup: GameSetupStep[];
  rules: string[];
  tips?: string[];
  warnings: GameWarning[];
}

// =============================================================================
// GAME DATA
// =============================================================================

export const gameWriteups: Record<string, GameWriteup> = {
  'kings-cup': {
    id: 'kings-cup',
    title: "King's Cup",
    origin: 'USA',
    players: '4–10+',
    difficulty: 'Easy',
    drinkingStyle: 'Sips',
    image: games.kingsCup,
    description: 'The ultimate card-based drinking game. Draw cards and perform actions based on the card drawn. A must-know for any party host.',
    equipment: [
      { icon: 'coffee', title: 'Cups (one per player)' },
      { icon: 'coffee', title: '1 Large Cup (the King\'s Cup)' },
      { icon: 'layers', title: 'Standard Deck of Cards' },
      { icon: 'grid', title: 'Table' },
      { icon: 'droplet', title: 'Drinks of Choice' },
    ],
    setup: [
      { icon: 'coffee', text: "Place the empty King's Cup in the center of the table" },
      { icon: 'square', text: 'Spread the deck face-down in a circle around the cup' },
      { icon: 'users', text: 'Players sit in a circle with drinks ready' },
    ],
    rules: [
      'Ace (Waterfall): Everyone drinks in sequence until the starter stops',
      '2 (You): Choose someone to drink',
      '3 (Me): Drawer drinks',
      '4 (Floor): Last to touch the floor drinks',
      '5 (Guys): All men drink',
      '6 (Girls): All women drink',
      '7 (Heaven): Last to raise hand drinks',
      '8 (Mate): Choose a drink buddy for the round',
      '9 (Rhyme): Say a word; others must rhyme it — first to fail drinks',
      '10 (Categories): Pick a category; go around until someone can\'t answer',
      'Jack (Make a Rule): Create a rule everyone must follow for the rest of the game',
      'Queen (Question Master): Become the Question Master — anyone who answers your questions drinks',
      "King: Pour some of your drink into King's Cup. Last King drawn chugs the whole thing",
    ],
    tips: [
      'House rules are encouraged — make the Jack rules creative',
      'The Question Master power stays until the next Queen is drawn',
      'Use a shuffled deck to keep things unpredictable',
    ],
    warnings: [
      { text: 'Game escalates quickly — pace your drinks' },
      { text: 'Not recommended for solo play or very small groups' },
      { text: 'Hydrate between rounds' },
    ],
  },

  'flip-cup': {
    id: 'flip-cup',
    title: 'Flip Cup',
    origin: 'USA',
    players: '2–4 per team',
    difficulty: 'Easy',
    drinkingStyle: 'Chugs',
    image: games.flipCup,
    description: 'Fast-paced team relay game. Drink and flip your cup before the next player goes. Speed, coordination, and team spirit required.',
    equipment: [
      { icon: 'coffee', title: 'Plastic cups (one per player)' },
      { icon: 'grid', title: 'Long table' },
      { icon: 'droplet', title: 'Beer or drinks of choice' },
    ],
    setup: [
      { icon: 'users', text: 'Divide players into two equal teams' },
      { icon: 'grid', text: 'Teams line up on opposite sides of the table' },
      { icon: 'coffee', text: 'Fill each cup with a small amount of drink (2–3 oz)' },
      { icon: 'square', text: 'Place cups right-side up along the table edge' },
    ],
    rules: [
      'Teams face off across the table, one player per position',
      'On "Go!", the first player on each team drinks their cup',
      'After finishing, place the cup face-up on the table edge with part hanging off',
      'Flick the bottom rim to flip the cup upside down (landing face-down)',
      'Once your cup lands face-down, the next teammate begins',
      'Continue relay-style down the line',
      'First team to have all players successfully flip their cups wins the round',
      'Best of 3, 5, or 7 rounds for a full match',
    ],
    tips: [
      'Use one firm flick from the bottom — don\'t overthink it',
      'Drinking faster gives your team a head start on the flip',
      'Place your strongest flipper as your anchor (last position)',
      'Consistent cup placement on the edge matters more than force',
    ],
    warnings: [
      { text: 'Pace yourself across multiple rounds' },
      { text: 'Keep the table dry for consistent flips' },
      { text: 'Designate a ref to watch for early starts' },
    ],
  },

  'beer-pong': {
    id: 'beer-pong',
    title: 'Beer Pong',
    origin: 'USA',
    players: '2–4',
    difficulty: 'Medium',
    drinkingStyle: 'Sips / Chugs',
    image: games.beerPong,
    description: 'The iconic party game. Toss ping pong balls into cups across the table. Master your arc and dominate the competition.',
    equipment: [
      { icon: 'coffee', title: '20 plastic cups (10 per side)' },
      { icon: 'circle', title: '2 ping pong balls' },
      { icon: 'grid', title: 'Long table (8 ft standard)' },
      { icon: 'droplet', title: 'Beer or drinks of choice' },
      { icon: 'droplet', title: 'Water cups for rinsing balls' },
    ],
    setup: [
      { icon: 'triangle', text: 'Arrange 10 cups in a triangle (4-3-2-1) at each end of the table' },
      { icon: 'droplet', text: 'Fill each cup with 2–3 oz of beer (or water + side drinks)' },
      { icon: 'users', text: 'Two teams of 1 or 2 players stand at opposite ends' },
      { icon: 'coffee', text: 'Place a water cup to the side for ball rinsing' },
    ],
    rules: [
      'Each team takes turns throwing ping pong balls at the opposing cups',
      'Each player shoots one ball per turn (2 shots per team with 2 players)',
      'If a ball lands in a cup, the opposing team drinks and removes that cup',
      'Both players sink? "Balls back" — the team shoots again',
      'Bounced shots count as 2 cups (but can be swatted after the bounce)',
      'Each team gets 2 re-racks per game (rearrange remaining cups)',
      'When the last cup is hit, the opposing team gets a rebuttal (one more turn each)',
      'If rebuttal succeeds, overtime: 3 cups each in a triangle',
      'Game ends when one team eliminates all opposing cups without rebuttal',
    ],
    tips: [
      'Arc your shot — a high arc increases the landing zone',
      'Aim for the back cups first, they\'re psychologically harder later',
      'Use a consistent shooting form for accuracy',
      'Call "heating up" after 2 consecutive makes, "on fire" after 3 (shoot until you miss)',
    ],
    warnings: [
      { text: 'Use water cups and drink from a side cup for hygiene' },
      { text: 'Games can last 15–30 minutes — stay hydrated' },
      { text: 'Set house rules before starting to avoid disputes' },
    ],
  },

  'ring-of-fire': {
    id: 'ring-of-fire',
    title: 'Ring of Fire',
    origin: 'UK',
    players: '2+',
    difficulty: 'Medium',
    drinkingStyle: 'Sips',
    image: games.ringOfFire,
    description: 'The British cousin of King\'s Cup with unique rule variations. Cards placed around a central cup create escalating stakes.',
    equipment: [
      { icon: 'coffee', title: '1 Large Pint Glass (center)' },
      { icon: 'layers', title: 'Standard Deck of Cards' },
      { icon: 'grid', title: 'Table' },
      { icon: 'droplet', title: 'Drinks of Choice' },
    ],
    setup: [
      { icon: 'coffee', text: 'Place a large empty glass in the center of the table' },
      { icon: 'layers', text: 'Spread the entire deck face-down in a ring around the glass' },
      { icon: 'square', text: 'Cards must form a continuous unbroken circle' },
      { icon: 'users', text: 'Players sit around the table with their drinks' },
    ],
    rules: [
      'Ace (Waterfall): Drawer starts drinking, each player follows in sequence — you can\'t stop until the person before you stops',
      '2 (Choose): Pick someone to drink',
      '3 (Me): You drink',
      '4 (Floor): Last to slap the table drinks',
      '5 (Thumb Master): Place thumb on table anytime — last to copy drinks. Power lasts until next 5',
      '6 (Chicks): Women drink',
      '7 (Heaven): Point up — last to notice drinks',
      '8 (Mate): Choose a drink mate — they drink every time you do (and vice versa)',
      '9 (Rhyme): Say a word, go around rhyming — first to hesitate or repeat drinks',
      '10 (Categories): Name a category topic, go around — first to fail drinks',
      'Jack (Rule): Create a rule that lasts the entire game — breaking it means drinking',
      'Queen (Question Master): You\'re QM until next Queen — anyone who answers your questions drinks',
      'King: Pour some of your drink into the center glass. Fourth King drinks the entire center glass',
      'Breaking the Ring: If you break the card circle while drawing, finish your drink',
    ],
    tips: [
      'The "breaking the ring" rule keeps card-drawing tense and careful',
      'Thumb Master is a sneaky power — use it when people aren\'t paying attention',
      'Jack rules stack — the game gets wilder as more rules accumulate',
    ],
    warnings: [
      { text: 'The center glass mix can be rough — pace your King pours wisely' },
      { text: 'Rules accumulate and get hard to track — keep it fun, not punishing' },
      { text: 'Stay hydrated between rounds' },
    ],
  },

  'fuzzy-duck': {
    id: 'fuzzy-duck',
    title: 'Fuzzy Duck',
    origin: 'UK',
    players: '2+',
    difficulty: 'Hard',
    drinkingStyle: 'Sips',
    image: games.fuzzyDuck,
    description: 'A tongue-twister drinking game that gets hilariously difficult as the night goes on. Say "fuzzy duck" or "ducky fuzz" without slipping up.',
    equipment: [
      { icon: 'droplet', title: 'Drinks of Choice' },
      { icon: 'users', title: 'A circle of friends' },
    ],
    setup: [
      { icon: 'users', text: 'Players sit in a circle' },
      { icon: 'arrow-right', text: 'Choose a starting direction (clockwise or counterclockwise)' },
      { icon: 'coffee', text: 'Everyone has their drink ready' },
    ],
    rules: [
      'Play goes around the circle in one direction',
      'Each player says "Fuzzy Duck" to pass play to the next person',
      'Any player can say "Does He?" to reverse the direction',
      'When reversed, the phrase changes to "Ducky Fuzz"',
      'Saying "Does He?" again reverses back — phrase returns to "Fuzzy Duck"',
      'If you stumble, say the wrong phrase, hesitate too long, or accidentally swear — you drink',
      'The penalty: take a sip and restart the round from that player',
      'Speed increases naturally as players try to catch each other off guard',
    ],
    tips: [
      'The humor comes from how close the phrases sound to profanity',
      'Say "Does He?" right before someone who\'s already struggling',
      'Speed is your weapon — rapid reversals cause the most mistakes',
      'This game gets exponentially harder (and funnier) as the night progresses',
    ],
    warnings: [
      { text: 'Tongue twisters get dangerous after a few drinks — expect slip-ups' },
      { text: 'Keep it lighthearted — the point is laughter, not punishment' },
      { text: 'Not suitable for formal gatherings' },
    ],
  },

  'truth-or-dare': {
    id: 'truth-or-dare',
    title: 'Truth or Dare',
    origin: 'Global',
    players: '2–10',
    difficulty: 'Medium',
    drinkingStyle: 'Sips (penalty)',
    image: games.truthOrDare,
    description: 'The classic party game with a drinking twist. Refuse a truth or dare and take a drink. Includes curated question and dare decks.',
    equipment: [
      { icon: 'droplet', title: 'Drinks of Choice' },
      { icon: 'users', title: 'A group of friends' },
      { icon: 'smartphone', title: 'Phone for timer (optional)' },
    ],
    setup: [
      { icon: 'users', text: 'Players sit in a circle or around a table' },
      { icon: 'arrow-right', text: 'Decide on turn order (clockwise, random, or spin-the-bottle)' },
      { icon: 'alert-circle', text: 'Agree on boundaries before starting — set hard limits' },
      { icon: 'coffee', text: 'Everyone has their drink ready as the penalty' },
    ],
    rules: [
      'On your turn, another player (or the group) asks: "Truth or Dare?"',
      'Choose TRUTH: You must honestly answer a question from the group',
      'Choose DARE: You must perform a dare chosen by the group',
      'If you refuse a truth or dare, you must drink as a penalty',
      'Double refusal (refusing twice in a row) = finish your drink',
      'Truths should be revealing but not cruel — keep it fun',
      'Dares should be funny or embarrassing, never dangerous',
      'After completing your truth or dare, the next player\'s turn begins',
      'Optional: Add a 30-second timer for dares to keep the pace up',
    ],
    tips: [
      'Set ground rules about topics that are off-limits before you start',
      'Escalate gradually — start mild and build intensity',
      'Mix up who asks the questions to keep things unpredictable',
      '"Dare" players tend to have more fun, but "Truth" keeps the gossip flowing',
    ],
    warnings: [
      { text: 'Respect personal boundaries — never pressure someone past their limit' },
      { text: 'Dares should never involve driving, dangerous stunts, or illegal activities' },
      { text: 'This game works best when everyone feels safe and comfortable' },
    ],
  },

  'most-likely-to': {
    id: 'most-likely-to',
    title: 'Most Likely To',
    origin: 'Global',
    players: '2–10',
    difficulty: 'Easy',
    drinkingStyle: 'Sips',
    image: games.mostLikelyTo,
    description: 'Vote on who in the group is most likely to do something outrageous. The person with the most votes drinks.',
    equipment: [
      { icon: 'droplet', title: 'Drinks of Choice' },
      { icon: 'users', title: 'A group of friends who know each other' },
    ],
    setup: [
      { icon: 'users', text: 'Players sit in a circle where everyone can see each other' },
      { icon: 'arrow-right', text: 'Choose someone to read the first prompt' },
      { icon: 'coffee', text: 'Everyone has their drink ready' },
    ],
    rules: [
      'One player reads a "Most Likely To..." prompt aloud',
      'On the count of 3, everyone points at the person they think fits best',
      'The person with the most fingers pointing at them drinks',
      'They drink one sip for each finger pointed at them',
      'In case of a tie, all tied players drink',
      'If someone points at themselves and wins, they drink double',
      'The person who just drank reads the next prompt',
      'Continue until prompts run out or everyone is having too much fun',
    ],
    tips: [
      'The best prompts are specific to your friend group',
      'Start with lighthearted prompts, escalate as the night goes on',
      'Unanimous votes are the funniest — embrace them',
      'Take turns making up prompts for a more personal touch',
    ],
    warnings: [
      { text: 'Avoid mean-spirited or deeply personal prompts' },
      { text: 'If someone is consistently targeted, rotate to a new game' },
      { text: 'Works best with groups who know each other well' },
    ],
  },

  'rage-cage': {
    id: 'rage-cage',
    title: 'Rage Cage',
    origin: 'Global',
    players: '2+',
    difficulty: 'Hard',
    drinkingStyle: 'Chugs',
    image: games.rageCage,
    description: 'High-intensity bouncing game with stacking cups. When someone catches up to you, stack your cup on theirs. Pure controlled chaos.',
    equipment: [
      { icon: 'coffee', title: '20–30 plastic cups' },
      { icon: 'circle', title: '2 ping pong balls' },
      { icon: 'grid', title: 'Large table' },
      { icon: 'droplet', title: 'Beer or drinks of choice' },
    ],
    setup: [
      { icon: 'coffee', text: 'Fill 20+ cups with a small amount of beer and cluster them in the center of the table' },
      { icon: 'coffee', text: 'Fill one cup in the middle more than the rest (the "death cup")' },
      { icon: 'users', text: 'Players stand around the table in a circle' },
      { icon: 'circle', text: 'Two players on opposite sides each start with a ball and an empty cup' },
    ],
    rules: [
      'Two starting players each grab a center cup, drink it, then try to bounce the ball into their empty cup',
      'If you make it on the FIRST try, you can pass your cup and ball to ANY player',
      'If it takes more than one try, pass to the player on your LEFT',
      'If the person to your left is still bouncing, STACK your cup on top of theirs',
      'The stacked player must grab a new cup from the center, drink it, then bounce into that cup',
      'The game creates a chase — faster bouncers catch up to slower ones',
      'Continue until all center cups are gone',
      'The "death cup" (the fullest one) is the ultimate penalty',
      'Last cup standing: whoever gets stuck with the death cup drinks it',
    ],
    tips: [
      'Bounce with a consistent motion — accuracy beats power',
      'When you make it on the first try, pass to the person BEFORE the slow bouncer to create a trap',
      'Keep your eye on both balls — the game moves fast',
      'The death cup should be clearly marked so everyone knows the stakes',
    ],
    warnings: [
      { text: 'This game moves extremely fast — drink water between rounds' },
      { text: 'Spills are inevitable — play on a surface you don\'t mind getting wet' },
      { text: 'Not recommended for beginners — start with Beer Pong first' },
    ],
  },

  'power-hour': {
    id: 'power-hour',
    title: 'Power Hour',
    origin: 'Global',
    players: '2+',
    difficulty: 'Easy',
    drinkingStyle: 'Shots (beer)',
    image: games.powerHour,
    description: 'Take a shot of beer every minute for 60 minutes. Simple concept, legendary endurance challenge. Use a timer or power hour playlist.',
    equipment: [
      { icon: 'droplet', title: 'Beer (about 6–7 beers per person)' },
      { icon: 'coffee', title: 'Shot glass or small cup per person' },
      { icon: 'clock', title: 'Timer or Power Hour playlist (changes songs every 60 seconds)' },
      { icon: 'grid', title: 'Table space' },
    ],
    setup: [
      { icon: 'coffee', text: 'Each player has a shot glass and beer ready to pour' },
      { icon: 'music', text: 'Queue up a Power Hour playlist (songs change every 60 seconds) or set a repeating 60-second timer' },
      { icon: 'users', text: 'Players sit comfortably — this lasts a full hour' },
      { icon: 'droplet', text: 'Have extra beer accessible — you\'ll go through about 60 shots (roughly 6 beers)' },
    ],
    rules: [
      'Every 60 seconds (or when the song changes), everyone takes a shot of beer',
      'That\'s it. 60 shots in 60 minutes. Simple rules, real endurance',
      'You must take the shot within 5 seconds of the signal',
      'Missing a shot: drink 2 shots next round as penalty',
      'Finishing all 60 shots earns bragging rights (and a glass of water)',
      'Optional: At the 30-minute mark, everyone cheers — you\'re halfway!',
      'Century Club variant: 100 shots in 100 minutes for true legends',
    ],
    tips: [
      'Use a Power Hour playlist — the music keeps energy high and timing automatic',
      'Pour your shots ahead in batches of 10 to avoid scrambling',
      'Light beer makes this much more manageable',
      'Eat a solid meal beforehand — an empty stomach makes this brutal',
    ],
    warnings: [
      { text: '60 shots = roughly 6 beers in one hour — know your limits' },
      { text: 'Always have water available and food nearby' },
      { text: 'Do NOT attempt the Century Club variant without experience' },
    ],
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getGameWriteup(id: string): GameWriteup | undefined {
  return gameWriteups[id];
}

export function getAllGameIds(): string[] {
  return Object.keys(gameWriteups);
}
