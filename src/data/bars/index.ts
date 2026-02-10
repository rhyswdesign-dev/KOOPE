import { BarContent } from '../../types/bar';

export const BARS: Record<string, BarContent> = {
  the_alchemist: {
    id: 'the_alchemist',
    name: 'The Alchemist',
    hero: {
      image: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?q=80&w=1200&auto=format&fit=crop',
      location: 'Distillery District, Toronto',
      xpReward: 150,
    },
    location: {
      latitude: 43.6503,
      longitude: -79.3593,
      name: 'The Alchemist',
      address: '15 Trinity St',
      city: 'Toronto',
      state: 'ON',
      zipCode: 'M5A 3C4',
      country: 'Canada',
      phone: '+1 (416) 555-0123',
      website: 'https://thealchemist.ca'
    },
    quickInfo: {
      music: 'Ambient Electronic',
      vibe: 'Modern Laboratory',
      menu: 'Molecular Cocktails',
      happyHour: '5-7 PM Daily',
      popularNights: 'Science Thursdays'
    },
    signatureDrinks: [
      {
        image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?q=80&w=800&auto=format&fit=crop',
        name: 'Smoke & Mirrors',
        tagline: 'Mezcal, dry ice, activated charcoal',
        price: '$18'
      },
      {
        image: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?q=80&w=800&auto=format&fit=crop',
        name: 'Golden Ratio',
        tagline: 'Bourbon, honey spherification, gold leaf',
        price: '$22'
      }
    ],
    events: [
      {
        title: 'Molecular Mixology Workshop',
        dateISO: '2024-09-20T19:00:00.000Z',
        time: '7:00 PM',
        city: 'Toronto'
      }
    ],
    challenge: {
      image: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?q=80&w=1200&auto=format&fit=crop',
      title: 'Create Your Own Chemical Reaction',
      copy: 'Design a cocktail using molecular gastronomy techniques. Our lab is your playground.',
      cta: 'Book Lab Time'
    },
    crowdTags: ['Scientists', 'Cocktail Nerds', 'Date Night', 'Instagram-worthy'],
    bartender: {
      name: 'Dr. Elena Vasquez',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&auto=format&fit=crop',
      quote: 'Every cocktail is an experiment waiting to happen.'
    },
    story: {
      short: 'Where chemistry meets cocktails in Toronto\'s most innovative drinking laboratory, transforming spirits through science and artistry.'
    }
  },

  the_velvet_curtain: {
    id: 'the_velvet_curtain',
    name: 'The Velvet Curtain',
    hero: {
      image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?q=80&w=1200&auto=format&fit=crop',
      location: 'Yorkville, Toronto',
      xpReward: 120,
    },
    quickTags: ['Intimate', 'Wine-focused', 'Romantic'],
    signatureDrinks: [
      {
        image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=800&auto=format&fit=crop',
        name: 'Velvet Kiss',
        tagline: 'Pinot Noir reduction, blackberry, rosemary',
        price: '$16'
      }
    ],
    social: [
      {
        image: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?q=80&w=400&auto=format&fit=crop',
        handle: '@winelover_to',
        caption: 'Perfect date night spot in Yorkville 🍷'
      }
    ],
    story: {
      short: 'Hidden behind a velvet curtain in Yorkville, this intimate wine bar offers curated selections and wine-based cocktails in a speakeasy atmosphere.'
    }
  },

  the_gilded_lily: {
    id: 'the_gilded_lily',
    name: 'The Gilded Lily',
    hero: {
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=1200&auto=format&fit=crop',
      location: 'King Street West, Toronto',
      xpReward: 180,
    },
    location: {
      latitude: 43.6465,
      longitude: -79.3952,
      name: 'The Gilded Lily',
      address: '125 King St W',
      city: 'Toronto',
      state: 'ON',
      zipCode: 'M5H 1J8',
      country: 'Canada',
      phone: '+1 (416) 555-0456',
      website: 'https://thegildedlily.ca'
    },
    quickInfo: {
      music: 'Live Jazz Nightly',
      vibe: '1920s Glamour',
      menu: 'Classic & Modern',
      happyHour: '4-6 PM',
      popularNights: 'Jazz Fridays & Saturdays'
    },
    signatureDrinks: [
      {
        image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?q=80&w=800&auto=format&fit=crop',
        name: 'Lily\'s Garden',
        tagline: 'Gin, elderflower, edible flowers',
        price: '$17'
      },
      {
        image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?q=80&w=800&auto=format&fit=crop',
        name: 'Golden Age',
        tagline: 'Champagne, gold leaf, honey',
        price: '$25'
      },
      {
        image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=800&auto=format&fit=crop',
        name: 'Midnight Serenade',
        tagline: 'Whiskey, dark chocolate, cherry',
        price: '$19'
      }
    ],
    events: [
      {
        title: 'Friday Night Jazz Sessions',
        dateISO: '2024-09-22T21:00:00.000Z',
        time: '9:00 PM',
        city: 'Toronto'
      },
      {
        title: 'Gatsby Night',
        dateISO: '2024-09-28T20:00:00.000Z',
        time: '8:00 PM',
        city: 'Toronto'
      }
    ],
    crowdTags: ['Jazz Lovers', 'Business Professionals', 'Celebration', 'Vintage Style'],
    bartender: {
      name: 'Marcus Thompson',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop',
      quote: 'Classic cocktails with a modern Toronto twist - that\'s the Lily way.'
    },
    challenge: {
      image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?q=80&w=1200&auto=format&fit=crop',
      title: 'Create a Prohibition-Era Cocktail',
      copy: 'Channel the 1920s spirit and craft a cocktail that would make a bootlegger proud.',
      cta: 'Join the Challenge'
    },
    story: {
      short: 'Step into the golden age at Toronto\'s most glamorous jazz bar, where live music and craft cocktails create the perfect night out.'
    }
  },

  the_iron_flask: {
    id: 'the_iron_flask',
    name: 'The Iron Flask',
    hero: {
      image: 'https://images.unsplash.com/photo-1569546913823-29ce4acc0c9a?q=80&w=1200&auto=format&fit=crop',
      location: 'Kensington Market, Toronto',
      xpReward: 200,
    },
    quickInfo: {
      music: 'Blues & Rock',
      vibe: 'Industrial Speakeasy',
      menu: 'Whiskey-Forward',
      happyHour: '6-8 PM',
      popularNights: 'Whiskey Wednesdays'
    },
    signatureDrinks: [
      {
        image: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?q=80&w=800&auto=format&fit=crop',
        name: 'Iron Will',
        tagline: 'Rye whiskey, maple, smoke',
        price: '$16'
      },
      {
        image: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?q=80&w=800&auto=format&fit=crop',
        name: 'Market Street',
        tagline: 'Bourbon, local honey, bitters',
        price: '$18'
      }
    ],
    events: [
      {
        title: 'Whiskey Tasting Night',
        dateISO: '2024-09-25T19:30:00.000Z',
        time: '7:30 PM',
        city: 'Toronto'
      }
    ],
    crowdTags: ['Whiskey Enthusiasts', 'Music Lovers', 'Hidden Gems', 'Industrial Vibes'],
    bartender: {
      name: 'Jake Morrison',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=400&auto=format&fit=crop',
      quote: 'Good whiskey tells a story. Great whiskey makes you forget everything else.'
    },
    challenge: {
      image: 'https://images.unsplash.com/photo-1569546913823-29ce4acc0c9a?q=80&w=1200&auto=format&fit=crop',
      title: 'The Whiskey Challenge',
      copy: 'Think you know whiskey? Take our blind tasting challenge and prove your palate.',
      cta: 'Accept Challenge'
    },
    story: {
      short: 'Hidden in Kensington Market, this industrial speakeasy celebrates Toronto\'s gritty spirit with exceptional whiskeys and blues music.'
    }
  },

  the_velvet_note: {
    id: 'the_velvet_note',
    name: 'The Velvet Note',
    hero: {
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1200&auto=format&fit=crop',
      location: 'The Danforth, Toronto',
      xpReward: 130,
    },
    quickTags: ['Live Music', 'Cozy', 'Eclectic'],
    signatureDrinks: [
      {
        image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=800&auto=format&fit=crop',
        name: 'Blue Note',
        tagline: 'Gin, blue curaçao, tonic',
        price: '$14'
      }
    ],
    events: [
      {
        title: 'Open Mic Night',
        dateISO: '2024-09-19T20:00:00.000Z',
        time: '8:00 PM',
        city: 'Toronto'
      }
    ],
    social: [
      {
        image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=400&auto=format&fit=crop',
        handle: '@torontomusic',
        caption: 'Best kept secret on The Danforth 🎵'
      }
    ],
    story: {
      short: 'An intimate music venue on The Danforth where local artists and cocktail lovers gather for unforgettable nights of music and drinks.'
    }
  },

  the_wine_cellar: {
    id: 'the_wine_cellar',
    name: 'The Wine Cellar',
    hero: {
      image: 'https://images.unsplash.com/photo-1566147780353-6296ce0e127e?q=80&w=1200&auto=format&fit=crop',
      location: 'Harbourfront, Toronto',
      xpReward: 160,
    },
    quickInfo: {
      music: 'Classical & Jazz',
      vibe: 'Underground Elegance',
      menu: 'Wine & Cheese Pairings',
      happyHour: '5-7 PM',
      popularNights: 'Wine Wednesdays'
    },
    signatureDrinks: [
      {
        image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=800&auto=format&fit=crop',
        name: 'Cellar Master',
        tagline: 'Aged port, cognac, vanilla',
        price: '$20'
      },
      {
        image: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?q=80&w=800&auto=format&fit=crop',
        name: 'Harbour Mist',
        tagline: 'Prosecco, elderflower, lavender',
        price: '$16'
      }
    ],
    events: [
      {
        title: 'Wine & Cheese Evening',
        dateISO: '2024-09-24T18:30:00.000Z',
        time: '6:30 PM',
        city: 'Toronto'
      }
    ],
    crowdTags: ['Wine Connoisseurs', 'Sophisticated', 'Underground', 'Cheese Lovers'],
    bartender: {
      name: 'Sophie Laurent',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&auto=format&fit=crop',
      quote: 'Wine is poetry in a bottle. Every vintage tells a different story.'
    },
    story: {
      short: 'Descend into Toronto\'s most elegant underground wine cellar, featuring rare vintages and expertly curated wine cocktails.'
    }
  },

  skyline_lounge: {
    id: 'skyline_lounge',
    name: 'Skyline Lounge',
    hero: {
      image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?q=80&w=1200&auto=format&fit=crop',
      location: 'CN Tower District, Toronto',
      xpReward: 250,
    },
    location: {
      latitude: 43.6426,
      longitude: -79.3871,
      name: 'Skyline Lounge',
      address: '301 Front St W',
      city: 'Toronto',
      state: 'ON',
      zipCode: 'M5V 2T6',
      country: 'Canada',
      phone: '+1 (416) 555-0789',
      website: 'https://skylinelounge.ca'
    },
    quickInfo: {
      music: 'Lounge & Deep House',
      vibe: 'Sky-High Luxury',
      menu: 'Premium Cocktails',
      happyHour: '5-7 PM',
      popularNights: 'Sunset Fridays'
    },
    signatureDrinks: [
      {
        image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?q=80&w=800&auto=format&fit=crop',
        name: 'Toronto Skyline',
        tagline: 'Premium vodka, maple, city lights',
        price: '$24'
      },
      {
        image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?q=80&w=800&auto=format&fit=crop',
        name: 'CN Tower Twist',
        tagline: 'Gin, cucumber, lime, height',
        price: '$22'
      },
      {
        image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?q=80&w=800&auto=format&fit=crop',
        name: 'Lake Ontario',
        tagline: 'Blue gin, tonic, fresh breeze',
        price: '$20'
      }
    ],
    events: [
      {
        title: 'Sunset Sessions',
        dateISO: '2024-09-27T18:00:00.000Z',
        time: '6:00 PM',
        city: 'Toronto'
      },
      {
        title: 'Rooftop Party',
        dateISO: '2024-10-05T19:00:00.000Z',
        time: '7:00 PM',
        city: 'Toronto'
      }
    ],
    crowdTags: ['Luxury', 'Views', 'Instagram-worthy', 'Special Occasions'],
    bartender: {
      name: 'Alex Chen',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop',
      quote: 'The best cocktails are served with the best views in Toronto.'
    },
    challenge: {
      image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?q=80&w=1200&auto=format&fit=crop',
      title: 'High-Altitude Cocktail Challenge',
      copy: 'Create a cocktail inspired by Toronto\'s skyline. The sky\'s the limit.',
      cta: 'Reach New Heights'
    },
    story: {
      short: 'Toronto\'s highest cocktail experience with breathtaking city views and cocktails that touch the clouds.'
    }
  },

  the_hidden_flask: {
    id: 'the_hidden_flask',
    name: 'The Hidden Flask',
    hero: {
      image: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?q=80&w=1200&auto=format&fit=crop',
      location: 'Queen Street West, Toronto',
      xpReward: 175,
    },
    quickTags: ['Secret', 'Underground', 'Exclusive'],
    signatureDrinks: [
      {
        image: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?q=80&w=800&auto=format&fit=crop',
        name: 'Secret Passage',
        tagline: 'Mystery spirits, unknown ingredients',
        price: '$19'
      }
    ],
    social: [
      {
        image: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?q=80&w=400&auto=format&fit=crop',
        handle: '@hiddentoronto',
        caption: 'Shh... the best secrets are shared over cocktails 🤫'
      }
    ],
    story: {
      short: 'Toronto\'s best-kept secret speakeasy on Queen West, where entry requires a password and every drink is a mystery worth solving.'
    }
  },

  the_tiki_hut: {
    id: 'the_tiki_hut',
    name: 'The Tiki Hut',
    hero: {
      image: 'https://images.unsplash.com/photo-1544441892-794166f1e3be?q=80&w=1200&auto=format&fit=crop',
      location: 'Beaches, Toronto',
      xpReward: 140,
    },
    quickInfo: {
      music: 'Tropical & Reggae',
      vibe: 'Island Paradise',
      menu: 'Rum-Based Cocktails',
      happyHour: '4-6 PM',
      popularNights: 'Tiki Tuesdays'
    },
    signatureDrinks: [
      {
        image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=800&auto=format&fit=crop',
        name: 'Toronto Mai Tai',
        tagline: 'Dark rum, maple, tropical fruits',
        price: '$15'
      },
      {
        image: 'https://images.unsplash.com/photo-1544441892-794166f1e3be?q=80&w=800&auto=format&fit=crop',
        name: 'Beaches Breeze',
        tagline: 'Coconut rum, pineapple, Lake Ontario mist',
        price: '$14'
      }
    ],
    events: [
      {
        title: 'Tropical Tuesday',
        dateISO: '2024-09-24T19:00:00.000Z',
        time: '7:00 PM',
        city: 'Toronto'
      }
    ],
    crowdTags: ['Tropical Vibes', 'Beach Lovers', 'Rum Enthusiasts', 'Summer Feel'],
    bartender: {
      name: 'Maria Santos',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&auto=format&fit=crop',
      quote: 'Every day is a beach day when you\'re mixing tropical cocktails.'
    },
    story: {
      short: 'Escape to the tropics at Toronto\'s premier tiki bar in the Beaches, where island vibes meet Canadian hospitality.'
    }
  },

  untitled_champagne_lounge: {
    id: 'untitled_champagne_lounge',
    name: 'Untitled Champagne Lounge',
    hero: {
      image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=1200&auto=format&fit=crop',
      location: 'Downtown, Calgary',
      xpReward: 300,
    },
    location: {
      latitude: 51.0447,
      longitude: -114.0719,
      name: 'Untitled Champagne Lounge',
      address: '888 8th Ave SW',
      city: 'Calgary',
      state: 'AB',
      zipCode: 'T2P 1H2',
      country: 'Canada',
      phone: '+1 (403) 555-0888',
      website: 'https://untitledchampagne.ca'
    },
    quickInfo: {
      music: 'Live Piano & Jazz',
      vibe: 'Sophisticated Luxury',
      menu: 'Champagne & Caviar Pairings',
      happyHour: '4-7 PM Fridays',
      popularNights: 'Champagne Fridays'
    },
    signatureDrinks: [
      {
        image: 'https://static.spotapps.co/spots/a5/ca32ea947b4e358e346531067a73ea/full',
        name: 'Casablanca',
        tagline: 'Champagne cocktail with exotic flair',
        price: '$24'
      },
      {
        image: 'https://static.spotapps.co/spots/e8/09729e7dd04ff0bd9bbb3203414bfb/full',
        name: 'Oaxaca Sour',
        tagline: 'Mezcal, lime, agave, egg white',
        price: '$18'
      },
      {
        image: 'https://static.spotapps.co/spots/10/2bc1cabfec40c4bdf7a24040b2b892/full',
        name: 'The Truffle Martini',
        tagline: 'Vodka, truffle essence, premium garnish',
        price: '$26'
      }
    ],
    events: [
      {
        title: 'Champagne Masterclass with Sommelier',
        dateISO: '2024-09-21T18:00:00.000Z',
        time: '6:00 PM',
        city: 'Calgary'
      },
      {
        title: 'Live Jazz & Champagne Evening',
        dateISO: '2024-09-26T20:00:00.000Z',
        time: '8:00 PM',
        city: 'Calgary'
      },
      {
        title: 'Caviar & Champagne Tasting',
        dateISO: '2024-09-30T19:00:00.000Z',
        time: '7:00 PM',
        city: 'Calgary'
      }
    ],
    challenge: {
      image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=1200&auto=format&fit=crop',
      title: 'Create the Ultimate Luxury Toast',
      copy: 'Design a champagne cocktail fit for royalty using our premium selection. Winner gets a private champagne dinner.',
      cta: 'Submit Your Recipe'
    },
    crowdTags: ['Luxury', 'Business Elite', 'Special Occasions', 'Sophisticated'],
    bartender: {
      name: 'Isabella Moreau',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&auto=format&fit=crop',
      quote: 'Champagne is the ultimate expression of celebration and sophistication.'
    },
    team: [
      {
        name: 'Isabella Moreau',
        role: 'Head Sommelier',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&auto=format&fit=crop'
      },
      {
        name: 'Philippe Laurent',
        role: 'Executive Bartender',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=400&auto=format&fit=crop'
      },
      {
        name: 'Victoria Sterling',
        role: 'Champagne Director',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b9e96c38?q=80&w=400&auto=format&fit=crop'
      }
    ],
    rewards: [
      {
        image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?q=80&w=600&auto=format&fit=crop',
        name: 'Private Champagne Tasting',
        xp: 500
      },
      {
        image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?q=80&w=600&auto=format&fit=crop',
        name: 'VIP Lounge Access',
        xp: 350
      },
      {
        image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=600&auto=format&fit=crop',
        name: 'Sommelier Consultation',
        xp: 250
      }
    ],
    social: [
      {
        image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=400&auto=format&fit=crop',
        handle: '@luxuryto',
        caption: 'The most elegant champagne experience in Toronto ✨🥂'
      },
      {
        image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?q=80&w=400&auto=format&fit=crop',
        handle: '@champagne_life',
        caption: 'Isabella knows her bubbles like no one else! 🍾'
      },
      {
        image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?q=80&w=400&auto=format&fit=crop',
        handle: '@financial_district',
        caption: 'Perfect for closing the biggest deals 💼'
      },
      {
        image: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?q=80&w=400&auto=format&fit=crop',
        handle: '@toronto_elite',
        caption: 'Where Toronto\'s finest come to celebrate'
      }
    ],
    story: {
      short: 'Toronto\'s premier champagne destination in the Financial District, where luxury meets sophistication in every bubble.',
      long: 'Toronto\'s premier champagne destination in the Financial District, where luxury meets sophistication in every bubble. Founded by renowned sommelier Isabella Moreau, Untitled Champagne Lounge represents the pinnacle of refined drinking culture in Canada. Our carefully curated selection features over 200 champagnes from the world\'s finest houses, paired with an atmosphere of understated elegance. From intimate business celebrations to milestone anniversaries, every moment here is crafted to perfection. Our team of champagne experts guides guests through exclusive tastings, rare vintage experiences, and bespoke cocktail creations that elevate champagne to an art form.'
    },
    vibes: {
      crowdAndAtmosphere: [
        { icon: 'account-tie', text: 'Business Elite' },
        { icon: 'glass-cocktail', text: 'Sophisticated Luxury' },
        { icon: 'clock-time-eight-outline', text: 'Peak Hours: 6 PM - 11 PM' },
      ],
      bartender: {
        name: 'Rhys Williams',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop',
        subtitle: 'Legendary Bartender',
      },
      travelTips: [
        { icon: 'subway-variant', text: 'Union Station - 3 blocks' },
        { icon: 'car-multiple', text: 'Valet parking available' },
        { icon: 'calendar-clock', text: 'Reservations recommended' },
      ],
      dressCodeAndEntry: [
        { icon: 'shirt-outline', text: 'Business Formal' },
        { icon: 'account-tie', text: 'Upscale experience' },
      ],
    }
  }
};

export const getBar = (id: string): BarContent | undefined => {
  return BARS[id];
};