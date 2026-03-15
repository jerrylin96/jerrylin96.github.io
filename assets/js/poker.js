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

  /* Best 5-card hand from 6 cards (C(6,5) = 6 combinations) */
  function bestOfN(cards) {
    if (cards.length === 5) return evaluate5(cards);
    var best = null;
    for (var skip = 0; skip < cards.length; skip++) {
      if (cards.length - 1 < 5) continue;
      var hand5 = [];
      for (var k = 0; k < cards.length; k++) {
        if (k !== skip) hand5.push(cards[k]);
      }
      if (hand5.length === 5) {
        var val = evaluate5(hand5);
        if (!best || compareHands(val, best) > 0) best = val;
      } else {
        var val2 = bestOfN(hand5);
        if (!best || compareHands(val2, best) > 0) best = val2;
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

  function handName(evalResult) {
    return HAND_NAMES[evalResult[0]];
  }

  /* ===== Equity computation functions ===== */

  function getRemainingCards(knownBoard, hero) {
    var used = {};
    var i;
    for (i = 0; i < knownBoard.length; i++) used[knownBoard[i]] = true;
    for (i = 0; i < hero.length; i++) used[hero[i]] = true;
    var remaining = [];
    for (i = 0; i < 52; i++) {
      if (!used[i]) remaining.push(i);
    }
    return remaining;
  }

  /* River equity: exact enumeration over all C(45,2)=990 opponent hands */
  function computeEquityRiver(board, hero) {
    var remaining = getRemainingCards(board, hero);
    var heroVal = bestOf7(board.concat(hero));
    var wins = 0, ties = 0, total = 0;
    for (var i = 0; i < remaining.length; i++) {
      for (var j = i + 1; j < remaining.length; j++) {
        var oppVal = bestOf7([board[0], board[1], board[2], board[3], board[4], remaining[i], remaining[j]]);
        var cmp = compareHands(heroVal, oppVal);
        if (cmp > 0) wins++;
        else if (cmp === 0) ties++;
        total++;
      }
    }
    var losses = total - wins - ties;
    return {
      equity: ((wins + ties * 0.5) / total) * 100,
      wins: wins, ties: ties, losses: losses, total: total,
      heroHand: handName(heroVal),
      method: 'Exact enumeration over all ' + total + ' possible opponent hands'
    };
  }

  /* Turn equity: exact enumeration over 46 river cards x C(45,2)=990 opponent hands */
  function computeEquityTurn(board4, hero) {
    var remaining = getRemainingCards(board4, hero);
    var wins = 0, ties = 0, total = 0;
    for (var r = 0; r < remaining.length; r++) {
      var fullBoard = [board4[0], board4[1], board4[2], board4[3], remaining[r]];
      var heroVal = bestOf7(fullBoard.concat(hero));
      for (var i = 0; i < remaining.length; i++) {
        if (i === r) continue;
        for (var j = i + 1; j < remaining.length; j++) {
          if (j === r) continue;
          var oppVal = bestOf7(fullBoard.concat([remaining[i], remaining[j]]));
          var cmp = compareHands(heroVal, oppVal);
          if (cmp > 0) wins++;
          else if (cmp === 0) ties++;
          total++;
        }
      }
    }
    var losses = total - wins - ties;
    var heroHandNow = bestOfN(board4.concat(hero));
    return {
      equity: ((wins + ties * 0.5) / total) * 100,
      wins: wins, ties: ties, losses: losses, total: total,
      heroHand: handName(heroHandNow),
      method: 'Exact enumeration over ' + remaining.length + ' river cards \u00d7 ' +
              (remaining.length - 1) * (remaining.length - 2) / 2 + ' opponent hands = ' + total + ' matchups'
    };
  }

  /* Preflop/Flop equity: Monte Carlo simulation */
  function computeEquityMC(knownBoard, hero, numSims) {
    var remaining = getRemainingCards(knownBoard, hero);
    var boardNeeded = 5 - knownBoard.length;
    var wins = 0, ties = 0, total = 0;
    for (var sim = 0; sim < numSims; sim++) {
      var deck = remaining.slice();
      shuffle(deck);
      var fullBoard = knownBoard.slice();
      var idx = 0;
      for (var b = 0; b < boardNeeded; b++) {
        fullBoard.push(deck[idx++]);
      }
      var opp = [deck[idx], deck[idx + 1]];
      var heroVal = bestOf7(fullBoard.concat(hero));
      var oppVal = bestOf7(fullBoard.concat(opp));
      var cmp = compareHands(heroVal, oppVal);
      if (cmp > 0) wins++;
      else if (cmp === 0) ties++;
      total++;
    }
    var losses = total - wins - ties;
    var heroHandLabel = null;
    if (knownBoard.length >= 3) {
      heroHandLabel = handName(bestOfN(knownBoard.concat(hero)));
    }
    return {
      equity: ((wins + ties * 0.5) / total) * 100,
      wins: wins, ties: ties, losses: losses, total: total,
      heroHand: heroHandLabel,
      method: 'Monte Carlo simulation (' + numSims.toLocaleString() + ' random deals)'
    };
  }

  /* Dispatcher: compute equity for any street */
  function computeStreetEquity(knownBoard, hero) {
    if (knownBoard.length === 5) return computeEquityRiver(knownBoard, hero);
    if (knownBoard.length === 4) return computeEquityTurn(knownBoard, hero);
    return computeEquityMC(knownBoard, hero, 10000);
  }

  /* Keep backward-compatible computeEquity for tests */
  function computeEquity(board, hero) {
    return computeEquityRiver(board, hero).equity;
  }

  /* ===== Game state ===== */
  var STREET_NAMES = ['Pre-flop', 'Flop', 'Turn'];
  var STREET_BOARD_COUNTS = [0, 3, 4];

  var round = 0;
  var street = 0; /* 0=preflop, 1=flop, 2=turn */
  var board = [];
  var hero = [];
  var streetErrors = [[], [], []]; /* errors per street */
  var allErrors = [];

  function startGame() {
    round = 0;
    streetErrors = [[], [], []];
    allErrors = [];
    nextRound();
  }

  function nextRound() {
    round++;
    var deck = shuffle(fullDeck());
    board = deck.slice(0, 5);
    hero = deck.slice(5, 7);
    street = 0;
    renderStreet();
  }

  function renderStreet() {
    var area = document.getElementById('game-area');
    area.innerHTML = '';

    var boardCount = STREET_BOARD_COUNTS[street];

    /* Score bar */
    var roundInfo = document.createElement('div');
    roundInfo.className = 'score-bar';
    var runningAvg = '';
    if (allErrors.length > 0) {
      var sum = 0;
      for (var ei = 0; ei < allErrors.length; ei++) sum += allErrors[ei];
      runningAvg = '  |  Running avg error: ' + (sum / allErrors.length).toFixed(1) + '%';
    }
    roundInfo.textContent = 'Round ' + round + ' of 10 \u2014 ' + STREET_NAMES[street] + runningAvg;
    area.appendChild(roundInfo);

    /* Board cards */
    var boardSection = document.createElement('div');
    boardSection.className = 'cards-section';
    var boardCardsHtml = '';
    for (var bi = 0; bi < 5; bi++) {
      if (bi < boardCount) {
        boardCardsHtml += '<div class="card ' + cardColor(board[bi]) + '">' + cardName(board[bi]) + '</div>';
      } else {
        boardCardsHtml += '<div class="card face-down">?</div>';
      }
    }
    boardSection.innerHTML = '<h3>Board</h3><div class="card-row">' + boardCardsHtml + '</div>';
    area.appendChild(boardSection);

    /* Hero cards */
    var heroSection = document.createElement('div');
    heroSection.className = 'cards-section';
    var heroCardsHtml = '';
    for (var hi = 0; hi < hero.length; hi++) {
      heroCardsHtml += '<div class="card ' + cardColor(hero[hi]) + '">' + cardName(hero[hi]) + '</div>';
    }
    heroSection.innerHTML = '<h3>Your Hand</h3><div class="card-row">' + heroCardsHtml + '</div>';
    area.appendChild(heroSection);

    /* Slider */
    var sliderSection = document.createElement('div');
    sliderSection.className = 'slider-section';
    sliderSection.innerHTML =
      '<label>Your guess: what % of random opponent hands does your hand beat?</label>' +
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
    btn.onclick = function() {
      btn.disabled = true;
      btn.textContent = 'Computing...';
      /* Use setTimeout to let the UI update before heavy computation */
      setTimeout(function() {
        submitStreetGuess(parseInt(slider.value));
      }, 50);
    };
    area.appendChild(btn);
  }

  function pct(n, total) {
    return (n / total * 100).toFixed(1);
  }

  function submitStreetGuess(guess) {
    var boardCount = STREET_BOARD_COUNTS[street];
    var knownBoard = board.slice(0, boardCount);
    var result = computeStreetEquity(knownBoard, hero);
    var error = Math.abs(guess - result.equity);

    streetErrors[street].push(error);
    allErrors.push(error);

    var area = document.getElementById('game-area');

    /* Result + math breakdown */
    var resultDiv = document.createElement('div');
    resultDiv.className = 'result-msg round';

    var html = '';
    if (result.heroHand) {
      html += 'Current best hand: <span class="hand-name">' + result.heroHand + '</span><br>';
    }
    html +=
      'Your guess: <strong>' + guess + '%</strong> | ' +
      'Actual equity: <strong>' + result.equity.toFixed(1) + '%</strong> | ' +
      'Error: <strong>' + error.toFixed(1) + '%</strong>';

    html += '<div class="math-breakdown">';
    html += '<div class="math-heading">Math breakdown</div>';
    html += '<div class="math-bars">';
    html += '<div class="math-bar-row"><span class="bar-label">Win</span>' +
            '<div class="bar-track"><div class="bar-fill win" style="width:' + pct(result.wins, result.total) + '%"></div></div>' +
            '<span class="bar-value">' + result.wins.toLocaleString() + ' (' + pct(result.wins, result.total) + '%)</span></div>';
    html += '<div class="math-bar-row"><span class="bar-label">Tie</span>' +
            '<div class="bar-track"><div class="bar-fill tie" style="width:' + pct(result.ties, result.total) + '%"></div></div>' +
            '<span class="bar-value">' + result.ties.toLocaleString() + ' (' + pct(result.ties, result.total) + '%)</span></div>';
    html += '<div class="math-bar-row"><span class="bar-label">Lose</span>' +
            '<div class="bar-track"><div class="bar-fill lose" style="width:' + pct(result.losses, result.total) + '%"></div></div>' +
            '<span class="bar-value">' + result.losses.toLocaleString() + ' (' + pct(result.losses, result.total) + '%)</span></div>';
    html += '</div>';

    html += '<div class="math-formula">';
    html += 'Equity = (wins + ties \u00d7 0.5) / total<br>';
    html += '= (' + result.wins.toLocaleString() + ' + ' + result.ties.toLocaleString() + ' \u00d7 0.5) / ' + result.total.toLocaleString() + '<br>';
    var numerator = result.wins + result.ties * 0.5;
    html += '= ' + numerator.toLocaleString() + ' / ' + result.total.toLocaleString() + ' = <strong>' + result.equity.toFixed(1) + '%</strong>';
    html += '</div>';

    html += '<div class="math-method">' + result.method + '</div>';
    html += '</div>';

    resultDiv.innerHTML = html;
    area.appendChild(resultDiv);

    /* Next button */
    var nextBtn = document.createElement('button');
    nextBtn.className = 'btn';
    if (street < 2) {
      nextBtn.textContent = 'Continue to ' + STREET_NAMES[street + 1];
      nextBtn.onclick = function() {
        street++;
        renderStreet();
      };
    } else {
      /* After turn guess, reveal river */
      nextBtn.textContent = 'Reveal River';
      nextBtn.onclick = showRiver;
    }
    area.appendChild(nextBtn);
  }

  function showRiver() {
    var area = document.getElementById('game-area');
    area.innerHTML = '';

    /* Score bar */
    var roundInfo = document.createElement('div');
    roundInfo.className = 'score-bar';
    var sum = 0;
    for (var ei = 0; ei < allErrors.length; ei++) sum += allErrors[ei];
    roundInfo.textContent = 'Round ' + round + ' of 10 \u2014 River  |  Running avg error: ' + (sum / allErrors.length).toFixed(1) + '%';
    area.appendChild(roundInfo);

    /* Full board */
    var boardSection = document.createElement('div');
    boardSection.className = 'cards-section';
    var boardCardsHtml = '';
    for (var bi = 0; bi < 5; bi++) {
      boardCardsHtml += '<div class="card ' + cardColor(board[bi]) + '">' + cardName(board[bi]) + '</div>';
    }
    boardSection.innerHTML = '<h3>Board</h3><div class="card-row">' + boardCardsHtml + '</div>';
    area.appendChild(boardSection);

    /* Hero cards */
    var heroSection = document.createElement('div');
    heroSection.className = 'cards-section';
    var heroCardsHtml = '';
    for (var hi = 0; hi < hero.length; hi++) {
      heroCardsHtml += '<div class="card ' + cardColor(hero[hi]) + '">' + cardName(hero[hi]) + '</div>';
    }
    heroSection.innerHTML = '<h3>Your Hand</h3><div class="card-row">' + heroCardsHtml + '</div>';
    area.appendChild(heroSection);

    /* Compute river equity and show final result */
    var result = computeEquityRiver(board, hero);

    var resultDiv = document.createElement('div');
    resultDiv.className = 'result-msg round';
    var html = 'Final hand: <span class="hand-name">' + result.heroHand + '</span><br>';
    html += 'River equity: <strong>' + result.equity.toFixed(1) + '%</strong>';

    html += '<div class="math-breakdown">';
    html += '<div class="math-heading">River math</div>';
    html += '<div class="math-bars">';
    html += '<div class="math-bar-row"><span class="bar-label">Win</span>' +
            '<div class="bar-track"><div class="bar-fill win" style="width:' + pct(result.wins, result.total) + '%"></div></div>' +
            '<span class="bar-value">' + result.wins.toLocaleString() + ' (' + pct(result.wins, result.total) + '%)</span></div>';
    html += '<div class="math-bar-row"><span class="bar-label">Tie</span>' +
            '<div class="bar-track"><div class="bar-fill tie" style="width:' + pct(result.ties, result.total) + '%"></div></div>' +
            '<span class="bar-value">' + result.ties.toLocaleString() + ' (' + pct(result.ties, result.total) + '%)</span></div>';
    html += '<div class="math-bar-row"><span class="bar-label">Lose</span>' +
            '<div class="bar-track"><div class="bar-fill lose" style="width:' + pct(result.losses, result.total) + '%"></div></div>' +
            '<span class="bar-value">' + result.losses.toLocaleString() + ' (' + pct(result.losses, result.total) + '%)</span></div>';
    html += '</div>';
    html += '<div class="math-formula">';
    html += 'Equity = (' + result.wins.toLocaleString() + ' + ' + result.ties.toLocaleString() + ' \u00d7 0.5) / ' + result.total.toLocaleString();
    html += ' = <strong>' + result.equity.toFixed(1) + '%</strong>';
    html += '</div>';
    html += '<div class="math-method">' + result.method + '</div>';
    html += '</div>';

    resultDiv.innerHTML = html;
    area.appendChild(resultDiv);

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
    var area = document.getElementById('game-area');

    var finalDiv = document.createElement('div');
    finalDiv.className = 'result-msg final';

    var totalSum = 0;
    for (var i = 0; i < allErrors.length; i++) totalSum += allErrors[i];
    var avgError = totalSum / allErrors.length;

    var rating;
    if (avgError < 5) rating = 'Incredible!';
    else if (avgError < 10) rating = 'Excellent!';
    else if (avgError < 15) rating = 'Great!';
    else if (avgError < 20) rating = 'Good';
    else if (avgError < 30) rating = 'Decent';
    else rating = 'Keep practicing!';

    var html = '<strong>Game Over!</strong><br>';
    html += 'Overall average error: <strong>' + avgError.toFixed(1) + '%</strong> \u2014 ' + rating + '<br><br>';

    html += '<div class="final-breakdown">';
    for (var s = 0; s < 3; s++) {
      var errs = streetErrors[s];
      if (errs.length > 0) {
        var streetSum = 0;
        for (var j = 0; j < errs.length; j++) streetSum += errs[j];
        html += STREET_NAMES[s] + ' avg error: <strong>' + (streetSum / errs.length).toFixed(1) + '%</strong><br>';
      }
    }
    html += '</div><br>';

    html += 'Errors by round:<br>';
    for (var r = 0; r < 10; r++) {
      var base = r * 3;
      html += 'R' + (r + 1) + ': ';
      for (var st = 0; st < 3; st++) {
        if (base + st < allErrors.length) {
          if (st > 0) html += ', ';
          html += STREET_NAMES[st].charAt(0) + ':' + allErrors[base + st].toFixed(1) + '%';
        }
      }
      if (r < 9) html += ' | ';
    }

    finalDiv.innerHTML = html;
    area.appendChild(finalDiv);

    var restartBtn = document.createElement('button');
    restartBtn.className = 'btn';
    restartBtn.textContent = 'Play Again';
    restartBtn.onclick = startGame;
    area.appendChild(restartBtn);
  }

  /* ===== Exports ===== */
  exports.cardRank = cardRank;
  exports.cardSuit = cardSuit;
  exports.cardName = cardName;
  exports.cardColor = cardColor;
  exports.fullDeck = fullDeck;
  exports.shuffle = shuffle;
  exports.evaluate5 = evaluate5;
  exports.bestOf7 = bestOf7;
  exports.bestOfN = bestOfN;
  exports.compareHands = compareHands;
  exports.computeEquity = computeEquity;
  exports.computeEquityRiver = computeEquityRiver;
  exports.computeEquityTurn = computeEquityTurn;
  exports.computeEquityMC = computeEquityMC;
  exports.computeStreetEquity = computeStreetEquity;
  exports.HAND_NAMES = HAND_NAMES;

  if (typeof window !== 'undefined') {
    window.startGame = startGame;
  }
})(typeof module !== 'undefined' && module.exports ? module.exports : {});
