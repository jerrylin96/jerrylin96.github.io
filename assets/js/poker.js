/* 1v1 Texas Hold'em vs GTO Bot */
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

  /* ===== 1v1 GTO Bot Game ===== */

  var STARTING_STACK = 200;
  var SMALL_BLIND = 1;
  var BIG_BLIND = 2;
  var STREET_NAMES_G = ['Pre-flop', 'Flop', 'Turn', 'River'];
  var BOARD_COUNTS_G = [0, 3, 4, 5];
  var NUM_ROUNDS = 10;

  var gs = null;

  function actorLabel(a) { return a === 'player' ? 'You' : 'Bot'; }
  function stackOf(a) { return a === 'player' ? gs.playerStack : gs.botStack; }
  function committedOf(a) { return a === 'player' ? gs.playerCommitted : gs.botCommitted; }
  function setCommitted(a, v) { if (a === 'player') gs.playerCommitted = v; else gs.botCommitted = v; }
  function addStack(a, v) { if (a === 'player') gs.playerStack += v; else gs.botStack += v; }
  function subStack(a, v) { if (a === 'player') gs.playerStack -= v; else gs.botStack -= v; }

  function addLog(msg) {
    gs.log.unshift(msg);
    if (gs.log.length > 8) gs.log.pop();
  }

  function startGame() {
    var stackInput = document.getElementById('start-stack-input');
    var startingStack = stackInput ? (parseInt(stackInput.value, 10) || STARTING_STACK) : STARTING_STACK;
    startingStack = Math.max(BIG_BLIND * 2, startingStack); /* must cover at least one blind each */
    gs = {
      playerStack: startingStack,
      botStack: startingStack,
      pot: 0,
      playerCommitted: 0,
      botCommitted: 0,
      board: [],
      playerHand: [],
      botHand: [],
      dealerIsPlayer: Math.random() < 0.5,
      roundNum: 0,
      roundsPlayed: 0,
      street: 0,
      toAct: null,
      sbActor: null,
      bbActor: null,
      bbActedVoluntarily: false,
      prevActionWasCheck: false,
      lastRaiseSize: BIG_BLIND,
      phase: 'idle',
      log: []
    };
    startRound();
  }

  function startRound() {
    gs.roundNum++;
    gs.pot = 0;
    gs.playerCommitted = 0;
    gs.botCommitted = 0;
    gs.street = 0;
    gs.bbActedVoluntarily = false;
    gs.prevActionWasCheck = false;
    gs.phase = 'betting';
    gs.log = [];

    /* In heads-up: dealer = small blind = button */
    gs.sbActor = gs.dealerIsPlayer ? 'player' : 'bot';
    gs.bbActor = gs.dealerIsPlayer ? 'bot' : 'player';

    var deck = shuffle(fullDeck());
    gs.playerHand = [deck[0], deck[2]];
    gs.botHand = [deck[1], deck[3]];
    gs.board = deck.slice(4, 9); /* full board dealt face-down, revealed per street */

    /* Post blinds */
    var sb = gs.sbActor, bb = gs.bbActor;
    var sbAmt = Math.min(SMALL_BLIND, stackOf(sb));
    var bbAmt = Math.min(BIG_BLIND, stackOf(bb));
    subStack(sb, sbAmt); setCommitted(sb, sbAmt);
    subStack(bb, bbAmt); setCommitted(bb, bbAmt);
    gs.pot = sbAmt + bbAmt;
    addLog(actorLabel(sb) + ' posts SB ' + sbAmt);
    addLog(actorLabel(bb) + ' posts BB ' + bbAmt);

    /* If either player is all-in after blinds, run out the board */
    if (stackOf(sb) === 0 || stackOf(bb) === 0) {
      gs.street = 3;
      doShowdown();
      return;
    }

    /* Preflop: SB acts first in heads-up */
    gs.toAct = gs.sbActor;
    renderGame();
    if (gs.toAct === 'bot') setTimeout(botAct, 900);
  }

  /* Core action handler */
  function processAction(actor, action, betTotal) {
    var other = actor === 'player' ? 'bot' : 'player';
    var myComm = committedOf(actor);
    var oppComm = committedOf(other);

    if (action === 'fold') {
      addLog(actorLabel(actor) + ' folds.');
      addStack(other, gs.pot);
      gs.pot = 0;
      endRound(other, null);
      return;
    }

    if (action === 'check') {
      addLog(actorLabel(actor) + ' checks.');
      if (gs.street === 0 && actor === gs.bbActor) gs.bbActedVoluntarily = true;
      if (gs.prevActionWasCheck) {
        advanceStreet();
        return;
      }
      gs.prevActionWasCheck = true;
      gs.toAct = other;
      renderGame();
      if (gs.toAct === 'bot') setTimeout(botAct, 900);
      return;
    }

    if (action === 'call') {
      var toCallFull = oppComm - myComm;
      var toCallActual = Math.min(toCallFull, stackOf(actor));
      var uncalled = toCallFull - toCallActual;
      subStack(actor, toCallActual);
      setCommitted(actor, myComm + toCallActual);
      gs.pot += toCallActual;
      if (uncalled > 0) {
        /* Return uncalled portion to opponent (player called all-in for less) */
        addStack(other, uncalled);
        setCommitted(other, oppComm - uncalled);
        gs.pot -= uncalled;
      }
      addLog(actorLabel(actor) + ' calls ' + toCallActual + '.');
      if (gs.street === 0 && actor === gs.bbActor) gs.bbActedVoluntarily = true;
      /* Preflop SB limp: BB still has option */
      if (gs.street === 0 && actor === gs.sbActor && !gs.bbActedVoluntarily) {
        gs.toAct = other;
        gs.prevActionWasCheck = false;
        renderGame();
        if (gs.toAct === 'bot') setTimeout(botAct, 900);
        return;
      }
      advanceStreet();
      return;
    }

    if (action === 'bet' || action === 'raise') {
      /* betTotal = new total commitment for this actor this street */
      var prevMax = Math.max(myComm, oppComm); /* track for min-raise size */
      var additional = Math.min(betTotal - myComm, stackOf(actor));
      betTotal = myComm + additional;
      subStack(actor, additional);
      setCommitted(actor, betTotal);
      gs.pot += additional;
      gs.lastRaiseSize = Math.max(betTotal - prevMax, 1);
      var verb = action === 'bet' ? 'bets ' : 'raises to ';
      addLog(actorLabel(actor) + ' ' + verb + betTotal + '.');
      gs.prevActionWasCheck = false;
      if (gs.street === 0 && actor === gs.bbActor) gs.bbActedVoluntarily = true;
      gs.toAct = other;
      renderGame();
      if (gs.toAct === 'bot') setTimeout(botAct, 900);
      return;
    }
  }

  function advanceStreet() {
    gs.playerCommitted = 0;
    gs.botCommitted = 0;
    gs.prevActionWasCheck = false;
    gs.lastRaiseSize = BIG_BLIND;

    if (gs.street >= 3) {
      doShowdown();
      return;
    }

    gs.street++;
    addLog('\u2014 ' + STREET_NAMES_G[gs.street] + ' \u2014');

    /* If either player is all-in, auto-advance remaining streets */
    if (stackOf('player') === 0 || stackOf('bot') === 0) {
      renderGame();
      setTimeout(function() { advanceStreet(); }, 1000);
      return;
    }

    /* Postflop: BB (non-dealer, out-of-position) acts first */
    gs.toAct = gs.bbActor;
    renderGame();
    if (gs.toAct === 'bot') setTimeout(botAct, 900);
  }

  function doShowdown() {
    gs.phase = 'showdown';
    var board5 = gs.board.slice(0, 5);
    var pVal = bestOf7(board5.concat(gs.playerHand));
    var bVal = bestOf7(board5.concat(gs.botHand));
    var cmp = compareHands(pVal, bVal);
    var winner;

    if (cmp > 0) {
      winner = 'player';
      addLog('You win with ' + handName(pVal) + '!');
    } else if (cmp < 0) {
      winner = 'bot';
      addLog('Bot wins with ' + handName(bVal) + '.');
    } else {
      winner = 'tie';
      addLog('Split pot \u2014 ' + handName(pVal) + '.');
    }

    if (winner === 'tie') {
      var half = Math.floor(gs.pot / 2);
      gs.playerStack += half;
      gs.botStack += gs.pot - half;
    } else {
      addStack(winner, gs.pot);
    }
    gs.pot = 0;
    endRound(winner, { pVal: pVal, bVal: bVal });
  }

  function endRound(winner, showdownInfo) {
    gs.roundsPlayed++;
    var isGameOver = gs.roundsPlayed >= NUM_ROUNDS || gs.playerStack <= 0 || gs.botStack <= 0;
    gs.phase = isGameOver ? 'gameover' : 'round_end';
    if (!isGameOver) gs.dealerIsPlayer = !gs.dealerIsPlayer;
    renderGame(showdownInfo, isGameOver);
  }

  /* ===== GTO Bot AI ===== */

  function botAct() {
    if (!gs || gs.toAct !== 'bot' || gs.phase !== 'betting') return;
    var decision = botDecide();
    processAction('bot', decision.action, decision.amount);
  }

  function botDecide() {
    var boardKnown = gs.board.slice(0, BOARD_COUNTS_G[gs.street]);
    /* Bot uses Monte Carlo vs random hands — cannot see player's cards */
    var simResult = computeEquityMC(boardKnown, gs.botHand, 500);
    var equity = simResult.equity / 100;

    var myComm = gs.botCommitted;
    var oppComm = gs.playerCommitted;
    var toCall = oppComm - myComm;
    var pot = gs.pot;
    var myStack = gs.botStack;
    var facingBet = toCall > 0;

    /* Slightly inflate preflop equity estimate to play aggressively heads-up */
    var adjEq = gs.street === 0 ? Math.min(1, equity * 1.08) : equity;

    if (facingBet) {
      var potOdds = toCall / (pot + toCall);

      if (adjEq > 0.65) {
        /* Strong hand: raise ~40% of time for value/balance */
        var raiseTotal = Math.min(myComm + Math.max(toCall + pot, toCall * 3), myComm + myStack);
        if (raiseTotal > oppComm && Math.random() < 0.40) {
          return { action: 'raise', amount: raiseTotal };
        }
        return { action: 'call' };
      }

      if (adjEq > potOdds + 0.08) return { action: 'call' };

      if (adjEq > potOdds - 0.06) {
        /* Marginal: mixed call/fold (makes us harder to exploit) */
        var callFreq = (adjEq - (potOdds - 0.06)) / 0.14;
        return Math.random() < callFreq ? { action: 'call' } : { action: 'fold' };
      }

      /* Below pot odds: bluff-catch with frequency ≈ potOdds (GTO indifference) */
      return Math.random() < potOdds * 0.3 ? { action: 'call' } : { action: 'fold' };
    }

    /* Not facing a bet: check or bet */

    /* Preflop SB opening: raise wide (GTO HU raises ~80% of buttons) */
    if (gs.street === 0 && gs.sbActor === 'bot' && !gs.bbActedVoluntarily) {
      var openRaise = Math.min(myComm + Math.floor(BIG_BLIND * 2.5), myComm + myStack);
      if (adjEq > 0.44) return { action: 'raise', amount: openRaise };
      if (Math.random() < 0.40) return { action: 'raise', amount: openRaise };
      return { action: 'call' }; /* limp worst hands */
    }

    var betAdd = Math.max(BIG_BLIND, Math.floor(pot * 0.5));
    betAdd = Math.min(betAdd, myStack);
    var betTotal = myComm + betAdd;

    /* Value range: polarized bet (strong + air, check middle) */
    if (adjEq > 0.60) {
      var valFreq = Math.min(0.85, (adjEq - 0.60) / 0.30 * 0.65 + 0.40);
      if (Math.random() < valFreq) return { action: 'bet', amount: betTotal };
      return { action: 'check' };
    }

    /* Bluff range: frequency calibrated so opponent is indifferent to calling */
    if (adjEq < 0.33) {
      var bluffFreq = betAdd / (pot + 2 * betAdd);
      bluffFreq = Math.min(0.35, bluffFreq);
      if (Math.random() < bluffFreq) return { action: 'bet', amount: betTotal };
      return { action: 'check' };
    }

    /* Middle range: mostly check, occasional protection bet */
    if (Math.random() < 0.12) return { action: 'bet', amount: betTotal };
    return { action: 'check' };
  }

  /* ===== UI Rendering ===== */

  function cardHtml(c, hidden) {
    if (hidden) return '<div class="card face-down">?</div>';
    return '<div class="card ' + cardColor(c) + '">' + cardName(c) + '</div>';
  }

  function renderGame(showdownInfo, isGameOver) {
    var area = document.getElementById('game-area');
    if (!area || !gs) return;

    var html = '';
    var revealBot = !!(showdownInfo || gs.phase === 'showdown');

    /* ── Header ── */
    html += '<div class="game-header">';
    html += '<div class="stacks">';
    html += '<span class="stack you">You: <strong>' + gs.playerStack + '</strong></span>';
    html += '<span class="pot">Pot: <strong>' + gs.pot + '</strong></span>';
    html += '<span class="stack bot">Bot: <strong>' + gs.botStack + '</strong></span>';
    html += '</div>';
    var dealerLabel = gs.dealerIsPlayer ? 'You' : 'Bot';
    html += '<div class="round-label">Round ' + gs.roundNum + '/' + NUM_ROUNDS +
            ' &mdash; ' + STREET_NAMES_G[gs.street] +
            ' &mdash; Dealer: ' + dealerLabel + '</div>';
    html += '</div>';

    /* ── Bot hand ── */
    html += '<div class="cards-section"><h3>Bot\'s Hand</h3><div class="card-row">';
    html += cardHtml(gs.botHand[0], !revealBot);
    html += cardHtml(gs.botHand[1], !revealBot);
    html += '</div></div>';

    /* ── Board ── */
    var boardShow = revealBot ? 5 : BOARD_COUNTS_G[gs.street];
    html += '<div class="cards-section"><h3>Board</h3><div class="card-row">';
    for (var bi = 0; bi < 5; bi++) {
      html += bi < boardShow ? cardHtml(gs.board[bi], false) : '<div class="card face-down">?</div>';
    }
    html += '</div></div>';

    /* ── Player hand ── */
    html += '<div class="cards-section"><h3>Your Hand</h3><div class="card-row">';
    html += cardHtml(gs.playerHand[0], false);
    html += cardHtml(gs.playerHand[1], false);
    html += '</div></div>';

    /* ── Action log ── */
    if (gs.log.length > 0) {
      html += '<div class="action-log">';
      for (var li = Math.min(gs.log.length - 1, 4); li >= 0; li--) {
        html += '<div class="log-entry">' + gs.log[li] + '</div>';
      }
      html += '</div>';
    }

    /* ── Showdown result ── */
    if (showdownInfo) {
      html += '<div class="showdown-result">';
      html += 'Your hand: <span class="hand-name">' + handName(showdownInfo.pVal) + '</span>';
      html += ' &mdash; Bot\'s hand: <span class="hand-name">' + handName(showdownInfo.bVal) + '</span>';
      html += '</div>';
    }

    /* ── Action area ── */
    if (gs.phase === 'betting' && gs.toAct === 'player') {
      html += buildActionButtons();
    } else if (gs.phase === 'betting' && gs.toAct === 'bot') {
      html += '<div class="status-msg">Bot is thinking\u2026</div>';
    } else if (gs.phase === 'round_end' || gs.phase === 'showdown') {
      html += '<button class="btn" onclick="nextRound()">Next Round</button>';
    }

    if (isGameOver) html += buildGameOver();

    area.innerHTML = html;
  }

  function buildActionButtons() {
    var myComm = gs.playerCommitted;
    var oppComm = gs.botCommitted;
    var toCall = oppComm - myComm;
    var pot = gs.pot;
    var myStack = gs.playerStack;
    var facingBet = toCall > 0;
    var html = '';

    if (facingBet) {
      /* ── Facing a bet: Fold / Call / Raise ── */
      var callAmt = Math.min(toCall, myStack);
      var allInRaiseTotal = myComm + myStack;
      /* Min raise = current bet + last raise size */
      var minRaiseTotal = oppComm + gs.lastRaiseSize;
      minRaiseTotal = Math.min(minRaiseTotal, allInRaiseTotal);

      html += '<div class="action-buttons">';
      html += '<button class="btn btn-fold" onclick="playerAction(\'fold\',0)">Fold</button>';
      var callLabel = callAmt >= myStack ? 'Call All-in (' + callAmt + ')' : 'Call ' + callAmt;
      html += '<button class="btn btn-call" onclick="playerAction(\'call\',0)">' + callLabel + '</button>';
      /* Quick raise shortcuts */
      var quickRaise = Math.min(Math.ceil(oppComm * 2.5), allInRaiseTotal);
      if (quickRaise >= minRaiseTotal && quickRaise < allInRaiseTotal) {
        html += '<button class="btn btn-raise" onclick="playerAction(\'raise\',' + quickRaise + ')">Raise to ' + quickRaise + '</button>';
      }
      if (allInRaiseTotal > oppComm) {
        html += '<button class="btn btn-allin" onclick="playerAction(\'raise\',' + allInRaiseTotal + ')">All-in ' + allInRaiseTotal + '</button>';
      }
      html += '</div>';

      /* Custom raise row */
      if (allInRaiseTotal > oppComm) {
        html += '<div class="custom-bet-row">';
        html += '<span class="custom-bet-label">Raise to:</span>';
        html += '<input type="number" id="custom-bet-input" class="bet-input"' +
                ' min="' + minRaiseTotal + '" max="' + allInRaiseTotal + '"' +
                ' value="' + minRaiseTotal + '" step="1"' +
                ' onkeydown="if(event.key===\'Enter\')playerCustomBet()">';
        html += '<button class="btn btn-raise" onclick="playerCustomBet()">Raise</button>';
        html += '<span id="custom-bet-err" class="bet-error"></span>';
        html += '</div>';
      }

      var poDisp = (toCall / (pot + toCall) * 100).toFixed(1);
      html += '<div class="pot-odds">Pot odds: call ' + callAmt + ' into ' + pot +
              ' &mdash; need &ge;' + poDisp + '% equity to call profitably</div>';
    } else {
      /* ── No bet facing: Check / Bet ── */
      var halfPotAmt = Math.max(BIG_BLIND, Math.floor(pot * 0.5));
      var fullPotAmt = Math.max(BIG_BLIND, pot);
      var halfTotal = myComm + halfPotAmt;
      var fullTotal = myComm + fullPotAmt;
      var allInBetTotal = myComm + myStack;

      html += '<div class="action-buttons">';
      html += '<button class="btn btn-check" onclick="playerAction(\'check\',0)">Check</button>';
      if (halfPotAmt < myStack) {
        html += '<button class="btn btn-bet" onclick="playerAction(\'bet\',' + halfTotal + ')">Bet ' + halfPotAmt + ' (&frac12; pot)</button>';
      }
      if (fullPotAmt < myStack && fullPotAmt !== halfPotAmt) {
        html += '<button class="btn btn-bet" onclick="playerAction(\'bet\',' + fullTotal + ')">Bet ' + fullPotAmt + ' (pot)</button>';
      }
      if (myStack > 0) {
        html += '<button class="btn btn-allin" onclick="playerAction(\'bet\',' + allInBetTotal + ')">All-in ' + myStack + '</button>';
      }
      html += '</div>';

      /* Custom bet row */
      if (myStack >= BIG_BLIND) {
        var defaultBet = Math.min(halfPotAmt, myStack);
        html += '<div class="custom-bet-row">';
        html += '<span class="custom-bet-label">Bet:</span>';
        html += '<input type="number" id="custom-bet-input" class="bet-input"' +
                ' min="' + BIG_BLIND + '" max="' + myStack + '"' +
                ' value="' + defaultBet + '" step="1"' +
                ' onkeydown="if(event.key===\'Enter\')playerCustomBet()">';
        html += '<button class="btn btn-bet" onclick="playerCustomBet()">Bet</button>';
        html += '<span id="custom-bet-err" class="bet-error"></span>';
        html += '</div>';
      }
    }

    return html;
  }

  function playerCustomBet() {
    if (!gs || gs.toAct !== 'player' || gs.phase !== 'betting') return;
    var input = document.getElementById('custom-bet-input');
    var errEl = document.getElementById('custom-bet-err');
    if (!input) return;

    var val = parseInt(input.value, 10);
    var myComm = gs.playerCommitted;
    var oppComm = gs.botCommitted;
    var toCall = oppComm - myComm;
    var myStack = gs.playerStack;
    var facingBet = toCall > 0;

    function showErr(msg) {
      if (errEl) errEl.textContent = msg;
      input.classList.add('bet-input-err');
    }
    function clearErr() {
      if (errEl) errEl.textContent = '';
      input.classList.remove('bet-input-err');
    }

    if (isNaN(val) || val <= 0) { showErr('Enter a positive number.'); return; }

    if (facingBet) {
      /* val is the total commitment for the raise */
      var allInTotal = myComm + myStack;
      var minRaiseTotal = oppComm + gs.lastRaiseSize;
      /* Allow raising all-in even if below normal min-raise */
      if (val < minRaiseTotal && val < allInTotal) {
        showErr('Min raise to ' + minRaiseTotal + ' (or go all-in for ' + allInTotal + ').');
        return;
      }
      if (val > allInTotal) { showErr('Max is ' + allInTotal + ' (all-in).'); return; }
      clearErr();
      playerAction('raise', Math.min(val, allInTotal));
    } else {
      /* val is the additional chips to bet */
      if (val < BIG_BLIND) { showErr('Min bet is ' + BIG_BLIND + '.'); return; }
      if (val > myStack) { showErr('Max is ' + myStack + ' (all-in).'); return; }
      clearErr();
      playerAction('bet', myComm + val);
    }
  }

  function buildGameOver() {
    var prevStack = gs.playerStack + gs.botStack; /* total chips = 2 × starting stack */
    var startingStack = prevStack / 2;
    var html = '<div class="result-msg final">';
    if (gs.playerStack <= 0) {
      html += '<strong>You busted!</strong> The bot wins the match.';
    } else if (gs.botStack <= 0) {
      html += '<strong>Bot busted!</strong> You win the match!';
    } else if (gs.playerStack > gs.botStack) {
      html += '<strong>Game over \u2014 You win!</strong> ' + gs.playerStack + ' vs ' + gs.botStack + ' chips.';
    } else if (gs.botStack > gs.playerStack) {
      html += '<strong>Game over \u2014 Bot wins.</strong> ' + gs.botStack + ' vs ' + gs.playerStack + ' chips.';
    } else {
      html += '<strong>Game over \u2014 Dead even!</strong>';
    }
    html += '<br><br>';
    html += '<div class="start-screen" style="display:inline-flex;flex-direction:row;align-items:center;">';
    html += '<div class="start-option">';
    html += '<label for="start-stack-input">Starting stack:</label>';
    html += '<input type="number" id="start-stack-input" value="' + startingStack + '" min="4" max="1000000" step="10">';
    html += '</div>';
    html += '<button class="btn" onclick="startGame()" style="margin-top:0;margin-left:8px;">Play Again</button>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  /* ===== Window-exposed functions ===== */

  function playerAction(action, totalCommitment) {
    if (!gs || gs.toAct !== 'player' || gs.phase !== 'betting') return;
    processAction('player', action, totalCommitment);
  }

  function nextRound() {
    if (!gs || (gs.phase !== 'round_end' && gs.phase !== 'showdown')) return;
    startRound();
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
    window.playerAction = playerAction;
    window.playerCustomBet = playerCustomBet;
    window.nextRound = nextRound;
  }
})(typeof module !== 'undefined' && module.exports ? module.exports : {});
