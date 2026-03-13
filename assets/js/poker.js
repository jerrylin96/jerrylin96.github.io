/* Poker Hand Strength Trainer */
(function(exports) {
  var RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
  var SUITS = ['s','h','d','c'];
  var SUIT_SYMBOLS = { s: '\u2660', h: '\u2665', d: '\u2666', c: '\u2663' };
  var SUIT_COLORS = { s: 'black', h: 'red', d: 'red', c: 'black' };

  function cardRank(c) { return c >> 2; }
  function cardSuit(c) { return c & 3; }
  function cardName(c) { return RANKS[cardRank(c)] + SUIT_SYMBOLS[SUITS[cardSuit(c)]]; }
  function cardColor(c) { return SUIT_COLORS[SUITS[cardSuit(c)]]; }

  function fullDeck() {
    var d = [];
    for (var i = 0; i < 52; i++) d.push(i);
    return d;
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  /*
   * Hand evaluation - returns array [category, ...kickers] for lexicographic comparison.
   * Categories: 0=high card, 1=pair, 2=two pair, 3=trips, 4=straight, 5=flush,
   *             6=full house, 7=quads, 8=straight flush
   */
  function evaluate5(cards) {
    var ranks = cards.map(cardRank).sort(function(a, b) { return b - a; });
    var suits = cards.map(cardSuit);

    var isFlush = suits[0] === suits[1] && suits[1] === suits[2] && suits[2] === suits[3] && suits[3] === suits[4];

    var isStraight = false;
    var straightHigh = -1;
    var uniqueRanks = {};
    var uniqueCount = 0;
    for (var ri = 0; ri < ranks.length; ri++) {
      if (!uniqueRanks[ranks[ri]]) { uniqueRanks[ranks[ri]] = true; uniqueCount++; }
    }
    if (ranks[0] - ranks[4] === 4 && uniqueCount === 5) {
      isStraight = true;
      straightHigh = ranks[0];
    }
    /* Wheel: A-2-3-4-5 */
    if (!isStraight && ranks[0] === 12 && ranks[1] === 3 && ranks[2] === 2 && ranks[3] === 1 && ranks[4] === 0) {
      isStraight = true;
      straightHigh = 3;
    }

    if (isStraight && isFlush) return [8, straightHigh];

    /* Group by rank */
    var counts = {};
    for (var ci = 0; ci < ranks.length; ci++) {
      counts[ranks[ci]] = (counts[ranks[ci]] || 0) + 1;
    }
    var groups = [];
    for (var key in counts) {
      if (counts.hasOwnProperty(key)) {
        groups.push([counts[key], parseInt(key)]);
      }
    }
    groups.sort(function(a, b) { return b[0] - a[0] || b[1] - a[1]; });

    if (groups[0][0] === 4) {
      return [7, groups[0][1], groups[1][1]];
    }
    if (groups[0][0] === 3 && groups[1][0] === 2) {
      return [6, groups[0][1], groups[1][1]];
    }
    if (isFlush) {
      return [5, ranks[0], ranks[1], ranks[2], ranks[3], ranks[4]];
    }
    if (isStraight) {
      return [4, straightHigh];
    }
    if (groups[0][0] === 3) {
      var kickers3 = [];
      for (var ki = 1; ki < groups.length; ki++) kickers3.push(groups[ki][1]);
      kickers3.sort(function(a, b) { return b - a; });
      return [3, groups[0][1], kickers3[0], kickers3[1]];
    }
    if (groups[0][0] === 2 && groups[1][0] === 2) {
      var pairs = [groups[0][1], groups[1][1]].sort(function(a, b) { return b - a; });
      return [2, pairs[0], pairs[1], groups[2][1]];
    }
    if (groups[0][0] === 2) {
      var kickers1 = [];
      for (var ki2 = 1; ki2 < groups.length; ki2++) kickers1.push(groups[ki2][1]);
      kickers1.sort(function(a, b) { return b - a; });
      return [1, groups[0][1], kickers1[0], kickers1[1], kickers1[2]];
    }
    return [0, ranks[0], ranks[1], ranks[2], ranks[3], ranks[4]];
  }

  /* Best 5-card hand from 7 cards (C(7,5) = 21 combinations) */
  function bestOf7(cards) {
    var best = null;
    for (var i = 0; i < 7; i++) {
      for (var j = i + 1; j < 7; j++) {
        var hand5 = [];
        for (var k = 0; k < 7; k++) {
          if (k !== i && k !== j) hand5.push(cards[k]);
        }
        var val = evaluate5(hand5);
        if (!best || compareHands(val, best) > 0) best = val;
      }
    }
    return best;
  }

  function compareHands(a, b) {
    var len = Math.max(a.length, b.length);
    for (var i = 0; i < len; i++) {
      var ai = i < a.length ? a[i] : 0;
      var bi = i < b.length ? b[i] : 0;
      if (ai !== bi) return ai - bi;
    }
    return 0;
  }

  var HAND_NAMES = [
    'High Card', 'One Pair', 'Two Pair', 'Three of a Kind',
    'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush'
  ];

  function handName(eval7) {
    return HAND_NAMES[eval7[0]];
  }

  /* Compute equity: % of opponent 2-card hands hero beats */
  function computeEquity(board, hero) {
    var used = {};
    var i, j;
    for (i = 0; i < board.length; i++) used[board[i]] = true;
    for (i = 0; i < hero.length; i++) used[hero[i]] = true;
    var remaining = [];
    for (i = 0; i < 52; i++) {
      if (!used[i]) remaining.push(i);
    }

    var heroCards = board.concat(hero);
    var heroVal = bestOf7(heroCards);

    var wins = 0, ties = 0, total = 0;
    for (i = 0; i < remaining.length; i++) {
      for (j = i + 1; j < remaining.length; j++) {
        var oppCards = [board[0], board[1], board[2], board[3], board[4], remaining[i], remaining[j]];
        var oppVal = bestOf7(oppCards);
        var cmp = compareHands(heroVal, oppVal);
        if (cmp > 0) wins++;
        else if (cmp === 0) ties++;
        total++;
      }
    }
    return ((wins + ties * 0.5) / total) * 100;
  }

  /* Game state */
  var round = 0;
  var errors = [];
  var currentEquity = 0;
  var currentHeroVal = null;

  function startGame() {
    round = 0;
    errors = [];
    nextRound();
  }

  function nextRound() {
    round++;
    var deck = shuffle(fullDeck());
    var board = deck.slice(0, 5);
    var hero = deck.slice(5, 7);

    currentEquity = computeEquity(board, hero);
    currentHeroVal = bestOf7(board.concat(hero));

    var area = document.getElementById('game-area');
    area.innerHTML = '';

    var roundInfo = document.createElement('div');
    roundInfo.className = 'score-bar';
    var runningAvg = '';
    if (errors.length > 0) {
      var sum = 0;
      for (var ei = 0; ei < errors.length; ei++) sum += errors[ei];
      runningAvg = '  |  Running avg error: ' + (sum / errors.length).toFixed(1) + '%';
    }
    roundInfo.textContent = 'Round ' + round + ' of 10' + runningAvg;
    area.appendChild(roundInfo);

    var boardSection = document.createElement('div');
    boardSection.className = 'cards-section';
    var boardCards = '';
    for (var bi = 0; bi < board.length; bi++) {
      boardCards += '<div class="card ' + cardColor(board[bi]) + '">' + cardName(board[bi]) + '</div>';
    }
    boardSection.innerHTML = '<h3>Board</h3><div class="card-row">' + boardCards + '</div>';
    area.appendChild(boardSection);

    var heroSection = document.createElement('div');
    heroSection.className = 'cards-section';
    var heroCards = '';
    for (var hi = 0; hi < hero.length; hi++) {
      heroCards += '<div class="card ' + cardColor(hero[hi]) + '">' + cardName(hero[hi]) + '</div>';
    }
    heroSection.innerHTML = '<h3>Your Hand</h3><div class="card-row">' + heroCards + '</div>';
    area.appendChild(heroSection);

    var sliderSection = document.createElement('div');
    sliderSection.className = 'slider-section';
    sliderSection.innerHTML =
      '<label>Your guess: what % of opponent hands does your hand beat?</label>' +
      '<div class="slider-row">' +
        '<span>0%</span>' +
        '<input type="range" id="guess-slider" min="0" max="100" value="50">' +
        '<span>100%</span>' +
        '<span class="slider-value" id="slider-val">50%</span>' +
      '</div>';
    area.appendChild(sliderSection);

    var slider = document.getElementById('guess-slider');
    var sliderVal = document.getElementById('slider-val');
    slider.addEventListener('input', function() {
      sliderVal.textContent = this.value + '%';
    });

    var btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = 'Submit Guess';
    btn.onclick = function() { submitGuess(parseInt(slider.value)); };
    area.appendChild(btn);
  }

  function submitGuess(guess) {
    var error = Math.abs(guess - currentEquity);
    errors.push(error);

    var area = document.getElementById('game-area');

    var btn = area.querySelector('.btn');
    btn.disabled = true;

    var result = document.createElement('div');
    result.className = 'result-msg round';
    result.innerHTML =
      'Your hand: <span class="hand-name">' + handName(currentHeroVal) + '</span><br>' +
      'Actual equity: <strong>' + currentEquity.toFixed(1) + '%</strong><br>' +
      'Your guess: <strong>' + guess + '%</strong><br>' +
      'Error: <strong>' + error.toFixed(1) + '%</strong>';
    area.appendChild(result);

    if (round < 10) {
      var nextBtn = document.createElement('button');
      nextBtn.className = 'btn';
      nextBtn.textContent = 'Next Round';
      nextBtn.onclick = nextRound;
      area.appendChild(nextBtn);
    } else {
      showFinalScore();
    }
  }

  function showFinalScore() {
    var sum = 0;
    for (var i = 0; i < errors.length; i++) sum += errors[i];
    var avgError = sum / errors.length;
    var area = document.getElementById('game-area');

    var finalDiv = document.createElement('div');
    finalDiv.className = 'result-msg final';
    var rating;
    if (avgError < 5) rating = 'Incredible!';
    else if (avgError < 10) rating = 'Excellent!';
    else if (avgError < 15) rating = 'Great!';
    else if (avgError < 20) rating = 'Good';
    else if (avgError < 30) rating = 'Decent';
    else rating = 'Keep practicing!';

    var roundErrors = '';
    for (var j = 0; j < errors.length; j++) {
      if (j > 0) roundErrors += ', ';
      roundErrors += 'R' + (j + 1) + ': ' + errors[j].toFixed(1) + '%';
    }

    finalDiv.innerHTML =
      '<strong>Game Over!</strong><br>' +
      'Average error: <strong>' + avgError.toFixed(1) + '%</strong><br>' +
      rating + '<br><br>' +
      'Errors by round: ' + roundErrors;
    area.appendChild(finalDiv);

    var restartBtn = document.createElement('button');
    restartBtn.className = 'btn';
    restartBtn.textContent = 'Play Again';
    restartBtn.onclick = startGame;
    area.appendChild(restartBtn);
  }

  exports.cardRank = cardRank;
  exports.cardSuit = cardSuit;
  exports.cardName = cardName;
  exports.cardColor = cardColor;
  exports.fullDeck = fullDeck;
  exports.shuffle = shuffle;
  exports.evaluate5 = evaluate5;
  exports.bestOf7 = bestOf7;
  exports.compareHands = compareHands;
  exports.computeEquity = computeEquity;
  exports.HAND_NAMES = HAND_NAMES;

  if (typeof window !== 'undefined') {
    window.startGame = startGame;
  }
})(typeof module !== 'undefined' && module.exports ? module.exports : {});
