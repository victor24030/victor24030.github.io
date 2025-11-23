// MorpSCRIPT_online.js (module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, set, update, get, onValue, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

/* =========== FIREBASE CONFIG =========== */
const firebaseConfig = {
  apiKey: "AIzaSyBqqD76xaN30m4eqVbUDFqXMrIdsv3ihII",
  authDomain: "tiktactoe-1e4d9.firebaseapp.com",
  databaseURL: "https://tiktactoe-1e4d9-default-rtdb.firebaseio.com",
  projectId: "tiktactoe-1e4d9",
  storageBucket: "tiktactoe-1e4d9.firebasestorage.app",
  messagingSenderId: "240419840590",
  appId: "1:240419840590:web:aa5f7fde9dbf45ea4e591f",
  measurementId: "G-1X7X2KPQ1H"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* =========== ONLINE GAME STATE =========== */
let onlineBoard = Array(4).fill(null).map(()=>Array(4).fill(''));
let onlineGameOver = false;
let onlineIsPlacing = true;
let onlineIsFirstMove = true;
let currentPlayerSymbol = null; // symbol of the player whose turn it is (string)
let mySymbol = null;            // my symbol (string)
let player1Sym = null;         // symbol stored in Firebase for player1
let player2Sym = null;
let currentGameId = null;
let actionsThisTurn = 0;

const uid = Math.random().toString(36).substring(2,10);
const onlineBoardContainer = document.getElementById('onlineBoard'); // will contain .board
const statusLine = document.getElementById('statusLine');
const loadingDots = document.getElementById('loadingDots');
const findBtn = document.getElementById('findMatchButton');
const quitBtn = document.getElementById('quitMatchButton');
const yourEmojiDisplay = document.getElementById('yourEmojiDisplay');
const opponentEmojiDisplay = document.getElementById('opponentEmojiDisplay');
const maxActions = 2;
const boardElement = document.createElement('div');


boardElement.className = 'board';
boardElement.style.display = 'grid';
boardElement.style.gridTemplateColumns = 'repeat(4, 60px)';
boardElement.style.gridTemplateRows = 'repeat(4, 60px)';
boardElement.style.gap = '5px';

function renderOnlineBoard(){
  boardElement.innerHTML = '';
  onlineBoard.forEach((row,r)=>{
    row.forEach((cell,c)=>{
      const div = document.createElement('div');
      div.className = 'cell';
      div.textContent = cell;
      div.onclick = () => handleOnlineClick(r,c);
      boardElement.appendChild(div);
    });
  });
}

/* =========== UTILS: loading dots =========== */
let loadingInterval = null;
function startLoading(){
  loadingDots.textContent = '';
  let count = 0;
  loadingInterval = setInterval(()=>{
    count = (count+1)%4;
    loadingDots.textContent = '.'.repeat(count);
  }, 400);
}
function stopLoading(){
  clearInterval(loadingInterval);
  loadingDots.textContent = '';
}

/* =========== MATCHMAKING =========== */
findBtn.onclick = () => findMatch();
quitBtn.onclick = () => quitMatch();

function getChosenEmojiFromHome(){
  // take the player1Input value from the Home page (fallback to ⚪)
  const v = document.getElementById('player1Input')?.value.trim();
  return (v && v.length>0) ? v : '⚪';
}

async function findMatch(){
  // disable button while searching
  findBtn.disabled = true;
  findBtn.textContent = 'Searching...';
  statusLine.textContent = 'Looking for opponent';
  startLoading();

  const waitingRef = ref(db, 'waitingPlayer');

  // try read who is waiting
  const snap = await get(waitingRef);
  const waiting = snap.val();

  if(waiting && waiting.uid && waiting.uid !== uid){
    // someone is waiting -> create game with them
    const gameId = Math.random().toString(36).substring(2,9);
    // emojis: current player sends his chosen emoji; the waited player has already sent theirs when they called findMatch
    // We'll fetch waiting.symbol
    const waitingSymbol = waiting.symbol || '⚪';
    const myEmoji = getChosenEmojiFromHome();

const gameObj = {
  board: Array(4).fill(null).map(()=>Array(4).fill('')),
  currentPlayer: waitingSymbol,
  player1: waiting.uid,
  player2: uid,
  player1Symbol: waitingSymbol,
  player2Symbol: myEmoji,
  player1FirstMove: true,
  player2FirstMove: true,
  isPlacing: true,
  isFirstMove: true,
  gameOver: false,
  actionsThisTurn: 0
};


    await set(ref(db, 'games/'+gameId), gameObj);
    // clear waiting slot
    await set(waitingRef, null);

    // start online game as player2
    startOnlineGame(gameId);
  } else {
    // no one waiting -> become the waiting player
    const myEmoji = getChosenEmojiFromHome();
    await set(waitingRef, { uid, symbol: myEmoji });
    statusLine.textContent = 'Waiting for opponent...';
    startLoading();

    // listen for a created game where I'm player2 (someone joined me)
    // We'll poll games list once in a while OR listen waitingRef changes.
    const unsub = onValue(waitingRef, async (s)=>{
      const val = s.val();
      if(!val) return; // cleared when matched by other
      if(val.uid !== uid) {
        // not me: someone replaced me (shouldn't normally happen)
        return;
      }
      // we stay waiting; when other player matches they will create a game and clear waitingRef,
      // so we need to detect added games where player1 === uid
      // But easiest: when waitingRef becomes null -> the other player created the game; now find it's game where player1===uid
      // Listen games once when waiting disappears
      const snapshotAfter = await get(wait(ref(db, 'games')));
      const games = snapshotAfter.val();
      if(!games) return;
      for(const k of Object.keys(games)){
        const g = games[k];
        if(g.player1 === uid && g.player2){ // we are player1 and someone joined
          // unsubscribe listening waiting
          unsub();
          startOnlineGame(k);
          return;
        }
      }
    });

    // fallback: also listen games to see when someone creates game with player1 === uid
    const unsubGames = onValue(ref(db, 'games'), (snap)=>{
      const games = snap.val();
      if(!games) return;
      for(const k of Object.keys(games)){
        const g = games[k];
        if(g.player1 === uid && g.player2){
          // found game
          stopLoading(); statusLine.textContent = 'Opponent found!';
          unsubGames(); // stop listening further
          startOnlineGame(k);
          return;
        }
      }
    });
  }
}

/* =========== START/STOP MATCH =========== */
async function startOnlineGame(gameId){
  currentGameId = gameId;
  stopLoading();
  statusLine.textContent = 'Opponent found!';

  // attach board to onlineBoard container (if it's not already)
  const container = document.getElementById('onlineBoard');
  if(container && !container.contains(boardElement)){
    container.appendChild(boardElement);
  }

  // subscribe to game changes
  onValue(ref(db, 'games/'+gameId), (snap)=>{
    const data = snap.val();
    if(!data) return;
    // update full state
    onlineBoard = data.board || onlineBoard;
    onlineGameOver = !!data.gameOver;
    onlineIsPlacing = !!data.isPlacing;
    onlineIsFirstMove = !!data.isFirstMove;
    currentPlayerSymbol = data.currentPlayer || currentPlayerSymbol;
    player1Sym = data.player1Symbol || player1Sym;
    player2Sym = data.player2Symbol || player2Sym;
    actionsThisTurn = data.actionsThisTurn ?? 0;

    // determine mySymbol based on uid
    if(data.player1 === uid) mySymbol = player1Sym;
    else if(data.player2 === uid) mySymbol = player2Sym;
    else {
      // spectator? treat as none
      mySymbol = null;
    }

    // update emoji displays
    yourEmojiDisplay.textContent = mySymbol || '⚪';
    opponentEmojiDisplay.textContent = (mySymbol === player1Sym ? player2Sym : player1Sym) || (mySymbol ? (mySymbol==='⚪'?'⚫':'⚪') : '⚫');

    // update UI text about turn and state
    const yourTurn = (mySymbol && currentPlayerSymbol === mySymbol && !onlineGameOver);
    if(onlineGameOver) {
      statusLine.textContent = 'Game over';
    } else if(yourTurn){
      statusLine.textContent = "Your turn";
    } else {
      statusLine.textContent = "Opponent's turn";
    }

    // disable/enable buttons
    findBtn.style.display = 'none';
    quitBtn.style.display = 'inline-block';

    // rerender board
    renderOnlineBoard();
  });
}

// Quit match: leave waiting or delete game if host
async function quitMatch(){
  // if waiting, remove waiting pointer
  await set(ref(db, 'waitingPlayer'), null);

  // if in game, remove game if i'm one player (simple cleanup)
  if(currentGameId){
    const gSnap = await get(ref(db, 'games/'+currentGameId));
    const g = gSnap.val();
    if(g){
      if(g.player1 === uid || g.player2 === uid){
        await remove(ref(db, 'games/'+currentGameId));
      }
    }
    currentGameId = null;
  }

  // reset UI
  stopLoading();
  statusLine.textContent = 'Not connected';
  findBtn.disabled = false;
  findBtn.textContent = 'Find match';
  findBtn.style.display = 'inline-block';
  quitBtn.style.display = 'none';
  // restore board to empty
  onlineBoard = Array(4).fill(null).map(()=>Array(4).fill(''));
  renderOnlineBoard();
  // move the boardElement back to the main Game page if needed (optional)
  const gamePageBoard = document.getElementById('board');
  if(gamePageBoard && !gamePageBoard.contains(boardElement)){
    // do nothing to not disturb local mode (we keep board in online container)
  }
}

/* =========== CLICK HANDLING (online) =========== */
async function handleOnlineClick(row, col) {
    if (!currentGameId) return;
    if (!mySymbol) return;

    const snap = await get(ref(db, "games/" + currentGameId));
    const data = snap.val();
    if (!data) return;
    if (data.gameOver) return;

    const board = data.board;
    const isPlacing = data.isPlacing;
    let actions = data.actionsThisTurn || 0;

    // déterminer si c’est mon tour
    const isMyTurn = data.currentPlayer === mySymbol;
    if (!isMyTurn) {
        statusLine.textContent = "Pas ton tour";
        return;
    }

    // symbole ennemi
    const amIPlayer1 = uid === data.player1;
    const enemySymbol = amIPlayer1 ? data.player2Symbol : data.player1Symbol;

    /* ============================
            PHASE : PLACER
       ============================ */
    if (isPlacing) {
        // case déjà occupée ?
        if (board[row][col] !== "") {
            statusLine.textContent = "Case occupée";
            return;
        }

        // placer
        board[row][col] = mySymbol;
        actions++;

        // fin de tour ?
        let nextPlayer = data.currentPlayer;
        let nextIsPlacing = true;

let nextIsFirstMove = data.isFirstMove; // garde l’état par défaut

if (actions >= maxActions) {
    actions = 0;
    if (isPlacing) {
        nextIsPlacing = false; // passe en conversion
        nextIsFirstMove = false; // le premier tour de placement est fini
    } else {
        nextIsPlacing = true; // retour en placement
    }
    nextPlayer = (mySymbol === data.player1Symbol) ? data.player2Symbol : data.player1Symbol;
}


await update(ref(db, "games/" + currentGameId), {
    board,
    currentPlayer: nextPlayer,
    isPlacing: nextIsPlacing,
    isFirstMove: nextIsFirstMove,
    actionsThisTurn: actions
});



        return;
    }

    /* ============================
            PHASE : CONVERTIR
       ============================ */
    else {
        // doit cliquer un pion adverse
        if (board[row][col] === "" || board[row][col] === mySymbol) {
            statusLine.textContent = "Choisis un pion adverse";
            return;
        }

        // convertir
        board[row][col] = mySymbol;
        actions++;

        let nextPlayer = data.currentPlayer;
        let nextIsPlacing = false;

        if (actions >= maxActions) {
            actions = 0;
            nextIsPlacing = true; // retour à la phase placement
            nextPlayer = (mySymbol === data.player1Symbol) ? data.player2Symbol : data.player1Symbol;
        }

        await update(ref(db, "games/" + currentGameId), {
            board,
            currentPlayer: nextPlayer,
            isPlacing: nextIsPlacing,
            actionsThisTurn: actions
        });

        return;
    }
}


/* =========== STARTUP =========== */
(function initOnlineUI(){
  // show chosen emoji from Home (player1Input)
  yourEmojiDisplay.textContent = getChosenEmojiFromHome();
  opponentEmojiDisplay.textContent = '...';

  // ensure boardElement renders initially
  renderOnlineBoard();

  // Make sure find button visible
  findBtn.disabled = false;
  findBtn.style.display = 'inline-block';
  quitBtn.style.display = 'none';
  statusLine.textContent = 'Not connected';
})();
