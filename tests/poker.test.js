var poker = require('../assets/js/poker');

/* Helper: build a card index from rank (0-12) and suit (0-3) */
function card(rank, suit) { return rank * 4 + suit; }

/* Suit constants */
var SPADES = 0, HEARTS = 1, DIAMONDS = 2, CLUBS = 3;

/* Rank constants */
var R2 = 0, R3 = 1, R4 = 2, R5 = 3, R6 = 4, R7 = 5, R8 = 6, R9 = 7, RT = 8, RJ = 9, RQ = 10, RK = 11, RA = 12;

describe('cardRank and cardSuit', function() {
  test('extracts rank and suit from card index', function() {
    expect(poker.cardRank(card(RA, SPADES))).toBe(RA);
    expect(poker.cardSuit(card(RA, SPADES))).toBe(SPADES);
    expect(poker.cardRank(card(R2, CLUBS))).toBe(R2);
    expect(poker.cardSuit(card(R2, CLUBS))).toBe(CLUBS);
  });

  test('all 52 cards have valid rank and suit', function() {
    for (var i = 0; i < 52; i++) {
      expect(poker.cardRank(i)).toBeGreaterThanOrEqual(0);
      expect(poker.cardRank(i)).toBeLessThanOrEqual(12);
      expect(poker.cardSuit(i)).toBeGreaterThanOrEqual(0);
      expect(poker.cardSuit(i)).toBeLessThanOrEqual(3);
    }
  });
});

describe('fullDeck', function() {
  test('returns 52 unique cards', function() {
    var deck = poker.fullDeck();
    expect(deck.length).toBe(52);
    var unique = {};
    for (var i = 0; i < deck.length; i++) unique[deck[i]] = true;
    expect(Object.keys(unique).length).toBe(52);
  });
});

describe('shuffle', function() {
  test('preserves all elements', function() {
    var deck = poker.fullDeck();
    var shuffled = poker.shuffle(deck.slice());
    shuffled.sort(function(a, b) { return a - b; });
    expect(shuffled).toEqual(poker.fullDeck());
  });
});

describe('evaluate5 - hand categories', function() {
  test('detects high card', function() {
    var hand = [card(RA, SPADES), card(RK, HEARTS), card(RQ, DIAMONDS), card(RJ, CLUBS), card(R9, SPADES)];
    var result = poker.evaluate5(hand);
    expect(result[0]).toBe(0);
  });

  test('detects one pair', function() {
    var hand = [card(RA, SPADES), card(RA, HEARTS), card(RK, DIAMONDS), card(RQ, CLUBS), card(RJ, SPADES)];
    var result = poker.evaluate5(hand);
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(RA);
  });

  test('detects two pair', function() {
    var hand = [card(RA, SPADES), card(RA, HEARTS), card(RK, DIAMONDS), card(RK, CLUBS), card(RQ, SPADES)];
    var result = poker.evaluate5(hand);
    expect(result[0]).toBe(2);
    expect(result[1]).toBe(RA);
    expect(result[2]).toBe(RK);
  });

  test('detects three of a kind', function() {
    var hand = [card(RA, SPADES), card(RA, HEARTS), card(RA, DIAMONDS), card(RK, CLUBS), card(RQ, SPADES)];
    var result = poker.evaluate5(hand);
    expect(result[0]).toBe(3);
    expect(result[1]).toBe(RA);
  });

  test('detects straight', function() {
    var hand = [card(R9, SPADES), card(R8, HEARTS), card(R7, DIAMONDS), card(R6, CLUBS), card(R5, SPADES)];
    var result = poker.evaluate5(hand);
    expect(result[0]).toBe(4);
    expect(result[1]).toBe(R9);
  });

  test('detects wheel (A-2-3-4-5)', function() {
    var hand = [card(RA, SPADES), card(R2, HEARTS), card(R3, DIAMONDS), card(R4, CLUBS), card(R5, SPADES)];
    var result = poker.evaluate5(hand);
    expect(result[0]).toBe(4);
    expect(result[1]).toBe(R5);
  });

  test('detects flush', function() {
    var hand = [card(RA, HEARTS), card(RK, HEARTS), card(RQ, HEARTS), card(RJ, HEARTS), card(R9, HEARTS)];
    var result = poker.evaluate5(hand);
    expect(result[0]).toBe(5);
  });

  test('detects full house', function() {
    var hand = [card(RA, SPADES), card(RA, HEARTS), card(RA, DIAMONDS), card(RK, CLUBS), card(RK, SPADES)];
    var result = poker.evaluate5(hand);
    expect(result[0]).toBe(6);
    expect(result[1]).toBe(RA);
    expect(result[2]).toBe(RK);
  });

  test('detects four of a kind', function() {
    var hand = [card(RA, SPADES), card(RA, HEARTS), card(RA, DIAMONDS), card(RA, CLUBS), card(RK, SPADES)];
    var result = poker.evaluate5(hand);
    expect(result[0]).toBe(7);
    expect(result[1]).toBe(RA);
  });

  test('detects straight flush', function() {
    var hand = [card(R9, HEARTS), card(R8, HEARTS), card(R7, HEARTS), card(R6, HEARTS), card(R5, HEARTS)];
    var result = poker.evaluate5(hand);
    expect(result[0]).toBe(8);
    expect(result[1]).toBe(R9);
  });

  test('detects royal flush (ace-high straight flush)', function() {
    var hand = [card(RA, SPADES), card(RK, SPADES), card(RQ, SPADES), card(RJ, SPADES), card(RT, SPADES)];
    var result = poker.evaluate5(hand);
    expect(result[0]).toBe(8);
    expect(result[1]).toBe(RA);
  });

  test('detects steel wheel (A-2-3-4-5 suited)', function() {
    var hand = [card(RA, DIAMONDS), card(R2, DIAMONDS), card(R3, DIAMONDS), card(R4, DIAMONDS), card(R5, DIAMONDS)];
    var result = poker.evaluate5(hand);
    expect(result[0]).toBe(8);
    expect(result[1]).toBe(R5);
  });
});

describe('compareHands', function() {
  test('higher category beats lower', function() {
    var pair = [1, RA, RK, RQ, RJ];
    var trips = [3, R2, R4, R3];
    expect(poker.compareHands(trips, pair)).toBeGreaterThan(0);
    expect(poker.compareHands(pair, trips)).toBeLessThan(0);
  });

  test('same category uses kickers', function() {
    var pairA = [1, RA, RK, RQ, RJ];
    var pairK = [1, RK, RQ, RJ, RT];
    expect(poker.compareHands(pairA, pairK)).toBeGreaterThan(0);
  });

  test('identical hands return 0', function() {
    var hand = [5, RA, RK, RQ, RJ, R9];
    expect(poker.compareHands(hand, hand)).toBe(0);
  });
});

describe('evaluate5 - kicker ordering', function() {
  test('high card kickers are ordered high to low', function() {
    var hand = [card(R9, SPADES), card(R7, HEARTS), card(R5, DIAMONDS), card(R3, CLUBS), card(R2, SPADES)];
    var result = poker.evaluate5(hand);
    expect(result).toEqual([0, R9, R7, R5, R3, R2]);
  });

  test('one pair kickers are ordered high to low', function() {
    var hand = [card(R9, SPADES), card(R9, HEARTS), card(R7, DIAMONDS), card(R5, CLUBS), card(R3, SPADES)];
    var result = poker.evaluate5(hand);
    expect(result).toEqual([1, R9, R7, R5, R3]);
  });

  test('two pair kicker is correct', function() {
    var hand = [card(R9, SPADES), card(R9, HEARTS), card(R7, DIAMONDS), card(R7, CLUBS), card(R3, SPADES)];
    var result = poker.evaluate5(hand);
    expect(result).toEqual([2, R9, R7, R3]);
  });
});

describe('bestOf7', function() {
  test('finds the best hand from 7 cards', function() {
    var cards = [
      card(RA, HEARTS), card(RK, HEARTS), card(RQ, HEARTS), card(RJ, HEARTS), card(R2, CLUBS),
      card(R9, HEARTS), card(R3, DIAMONDS)
    ];
    var result = poker.bestOf7(cards);
    expect(result[0]).toBe(5);
  });

  test('finds straight flush over flush', function() {
    var cards = [
      card(R9, HEARTS), card(R8, HEARTS), card(R7, HEARTS), card(R6, HEARTS), card(R5, HEARTS),
      card(RA, CLUBS), card(RK, CLUBS)
    ];
    var result = poker.bestOf7(cards);
    expect(result[0]).toBe(8);
  });

  test('finds full house from two trips', function() {
    var cards = [
      card(RA, SPADES), card(RA, HEARTS), card(RA, DIAMONDS),
      card(RK, SPADES), card(RK, HEARTS), card(RK, DIAMONDS),
      card(R2, CLUBS)
    ];
    var result = poker.bestOf7(cards);
    expect(result[0]).toBe(6);
    expect(result[1]).toBe(RA);
    expect(result[2]).toBe(RK);
  });
});

describe('bestOfN', function() {
  test('evaluates exactly 5 cards directly', function() {
    var cards = [card(RA, SPADES), card(RK, HEARTS), card(RQ, DIAMONDS), card(RJ, CLUBS), card(R9, SPADES)];
    var result = poker.bestOfN(cards);
    expect(result[0]).toBe(0);
  });

  test('finds best hand from 6 cards', function() {
    /* 6 cards with a flush possible in hearts */
    var cards = [
      card(RA, HEARTS), card(RK, HEARTS), card(RQ, HEARTS), card(RJ, HEARTS), card(R9, HEARTS),
      card(R2, CLUBS)
    ];
    var result = poker.bestOfN(cards);
    expect(result[0]).toBe(5); /* flush */
  });

  test('finds best hand from 6 cards - pair vs high card', function() {
    var cards = [
      card(RA, SPADES), card(RA, HEARTS), card(RK, DIAMONDS), card(RQ, CLUBS), card(RJ, SPADES),
      card(R2, HEARTS)
    ];
    var result = poker.bestOfN(cards);
    expect(result[0]).toBe(1); /* pair of aces */
    expect(result[1]).toBe(RA);
  });
});

describe('computeEquity (backward compatible)', function() {
  test('royal flush has ~100% equity', function() {
    var board = [card(RT, SPADES), card(RJ, SPADES), card(RQ, SPADES), card(R2, HEARTS), card(R3, DIAMONDS)];
    var hero = [card(RA, SPADES), card(RK, SPADES)];
    var equity = poker.computeEquity(board, hero);
    expect(equity).toBeGreaterThan(99);
  });

  test('quad aces has very high equity', function() {
    var board = [card(RA, SPADES), card(RA, HEARTS), card(RA, DIAMONDS), card(R2, CLUBS), card(R7, HEARTS)];
    var hero = [card(RA, CLUBS), card(RK, SPADES)];
    var equity = poker.computeEquity(board, hero);
    expect(equity).toBeGreaterThan(95);
  });

  test('equity is between 0 and 100', function() {
    var board = [card(R2, SPADES), card(R5, HEARTS), card(R8, DIAMONDS), card(RJ, CLUBS), card(RA, SPADES)];
    var hero = [card(R9, HEARTS), card(RT, DIAMONDS)];
    var equity = poker.computeEquity(board, hero);
    expect(equity).toBeGreaterThanOrEqual(0);
    expect(equity).toBeLessThanOrEqual(100);
  });

  test('board royal flush gives ~50% equity (all ties)', function() {
    var board = [card(RT, SPADES), card(RJ, SPADES), card(RQ, SPADES), card(RK, SPADES), card(RA, SPADES)];
    var hero = [card(R2, HEARTS), card(R3, HEARTS)];
    var equity = poker.computeEquity(board, hero);
    expect(equity).toBeCloseTo(50, 0);
  });
});

describe('computeEquityRiver (detailed)', function() {
  test('returns detailed result object', function() {
    var board = [card(RT, SPADES), card(RJ, SPADES), card(RQ, SPADES), card(R2, HEARTS), card(R3, DIAMONDS)];
    var hero = [card(RA, SPADES), card(RK, SPADES)];
    var result = poker.computeEquityRiver(board, hero);
    expect(result).toHaveProperty('equity');
    expect(result).toHaveProperty('wins');
    expect(result).toHaveProperty('ties');
    expect(result).toHaveProperty('losses');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('heroHand');
    expect(result).toHaveProperty('method');
    expect(result.total).toBe(990);
    expect(result.wins + result.ties + result.losses).toBe(990);
    expect(result.heroHand).toBe('Straight Flush');
  });
});

describe('computeEquityTurn (exact)', function() {
  test('returns detailed result with correct total matchups', function() {
    var board4 = [card(RT, SPADES), card(RJ, SPADES), card(RQ, SPADES), card(R2, HEARTS)];
    var hero = [card(RA, SPADES), card(RK, SPADES)];
    var result = poker.computeEquityTurn(board4, hero);
    expect(result).toHaveProperty('equity');
    expect(result).toHaveProperty('wins');
    expect(result).toHaveProperty('ties');
    expect(result).toHaveProperty('losses');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('heroHand');
    /* 46 river cards x C(45,2)=990 opponents = 45540 */
    expect(result.total).toBe(45540);
    expect(result.wins + result.ties + result.losses).toBe(45540);
    expect(result.equity).toBeGreaterThan(80);
  });

  test('equity is between 0 and 100', function() {
    var board4 = [card(R2, SPADES), card(R5, HEARTS), card(R8, DIAMONDS), card(RJ, CLUBS)];
    var hero = [card(R9, HEARTS), card(RT, DIAMONDS)];
    var result = poker.computeEquityTurn(board4, hero);
    expect(result.equity).toBeGreaterThanOrEqual(0);
    expect(result.equity).toBeLessThanOrEqual(100);
  });
});

describe('computeEquityMC (Monte Carlo)', function() {
  test('returns detailed result object', function() {
    var hero = [card(RA, SPADES), card(RK, SPADES)];
    var result = poker.computeEquityMC([], hero, 1000);
    expect(result).toHaveProperty('equity');
    expect(result).toHaveProperty('wins');
    expect(result).toHaveProperty('ties');
    expect(result).toHaveProperty('losses');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('method');
    expect(result.total).toBe(1000);
    expect(result.heroHand).toBeNull(); /* no board = no hero hand */
  });

  test('preflop pocket aces have high equity', function() {
    var hero = [card(RA, SPADES), card(RA, HEARTS)];
    var result = poker.computeEquityMC([], hero, 5000);
    expect(result.equity).toBeGreaterThan(75);
  });

  test('flop equity returns hero hand name', function() {
    var board3 = [card(RT, SPADES), card(RJ, SPADES), card(RQ, SPADES)];
    var hero = [card(RA, SPADES), card(RK, SPADES)];
    var result = poker.computeEquityMC(board3, hero, 1000);
    expect(result.heroHand).toBe('Straight Flush');
    expect(result.equity).toBeGreaterThan(90);
  });
});

describe('computeStreetEquity (dispatcher)', function() {
  test('uses exact enumeration for 5-card board', function() {
    var board = [card(RT, SPADES), card(RJ, SPADES), card(RQ, SPADES), card(R2, HEARTS), card(R3, DIAMONDS)];
    var hero = [card(RA, SPADES), card(RK, SPADES)];
    var result = poker.computeStreetEquity(board, hero);
    expect(result.total).toBe(990);
    expect(result.method).toContain('Exact');
  });

  test('uses exact enumeration for 4-card board', function() {
    var board4 = [card(RT, SPADES), card(RJ, SPADES), card(RQ, SPADES), card(R2, HEARTS)];
    var hero = [card(RA, SPADES), card(RK, SPADES)];
    var result = poker.computeStreetEquity(board4, hero);
    expect(result.total).toBe(45540);
  });

  test('uses Monte Carlo for 3-card board', function() {
    var board3 = [card(RT, SPADES), card(RJ, SPADES), card(RQ, SPADES)];
    var hero = [card(RA, SPADES), card(RK, SPADES)];
    var result = poker.computeStreetEquity(board3, hero);
    expect(result.total).toBe(10000);
    expect(result.method).toContain('Monte Carlo');
  });

  test('uses Monte Carlo for preflop (0-card board)', function() {
    var hero = [card(RA, SPADES), card(RK, SPADES)];
    var result = poker.computeStreetEquity([], hero);
    expect(result.total).toBe(10000);
    expect(result.method).toContain('Monte Carlo');
  });
});

describe('hand ranking hierarchy', function() {
  test('straight flush > four of a kind > full house > flush > straight > trips > two pair > pair > high card', function() {
    var hands = [
      { name: 'high card', cards: [card(RA, SPADES), card(RK, HEARTS), card(RQ, DIAMONDS), card(RJ, CLUBS), card(R9, SPADES)] },
      { name: 'pair', cards: [card(RA, SPADES), card(RA, HEARTS), card(RK, DIAMONDS), card(RQ, CLUBS), card(RJ, SPADES)] },
      { name: 'two pair', cards: [card(RA, SPADES), card(RA, HEARTS), card(RK, DIAMONDS), card(RK, CLUBS), card(RQ, SPADES)] },
      { name: 'trips', cards: [card(RA, SPADES), card(RA, HEARTS), card(RA, DIAMONDS), card(RK, CLUBS), card(RQ, SPADES)] },
      { name: 'straight', cards: [card(R9, SPADES), card(R8, HEARTS), card(R7, DIAMONDS), card(R6, CLUBS), card(R5, SPADES)] },
      { name: 'flush', cards: [card(RA, HEARTS), card(RK, HEARTS), card(RQ, HEARTS), card(RJ, HEARTS), card(R9, HEARTS)] },
      { name: 'full house', cards: [card(RA, SPADES), card(RA, HEARTS), card(RA, DIAMONDS), card(RK, CLUBS), card(RK, SPADES)] },
      { name: 'quads', cards: [card(RA, SPADES), card(RA, HEARTS), card(RA, DIAMONDS), card(RA, CLUBS), card(RK, SPADES)] },
      { name: 'straight flush', cards: [card(R9, HEARTS), card(R8, HEARTS), card(R7, HEARTS), card(R6, HEARTS), card(R5, HEARTS)] },
    ];

    for (var i = 0; i < hands.length - 1; i++) {
      var lower = poker.evaluate5(hands[i].cards);
      var higher = poker.evaluate5(hands[i + 1].cards);
      expect(poker.compareHands(higher, lower)).toBeGreaterThan(0);
    }
  });
});
