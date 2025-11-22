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
const uid = Math.random().toString(36).substring(2,10);

/* =========== DOM =========== */
const onlineBoardContainer = document.getElementById('onlineBoard'); // will contain .board
const statusLine = document.getElementById('statusLine');
const loadingDots = document.getElementById('loadingDots');
const findBtn = document.getElementById('findMatchButton');
const quitBtn = document.getElementById('quitMatchButton');
const yourEmojiDisplay = document.getElementById('yourEmojiDisplay');
const opponentEmojiDisplay = document.getElementById('opponentEmojiDisplay');

// reuse the same .board DOM structure used in local: create a board element
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
      currentPlayer: waitingSymbol, // let waiting player start (first in queue)
      player1: waiting.uid,
      player2: uid,
      player1Symbol: waitingSymbol,
      player2Symbol: myEmoji,
      isPlacing: true,
      isFirstMove: true,
      gameOver: false
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
function handleOnlineClick(row,col){
  if(!currentGameId) return;
  // must have mySymbol and must be my turn
  if(!mySymbol) { statusLine.textContent = 'Not in game'; return; }
  if(onlineGameOver) return;

  // check whose turn
  if(currentPlayerSymbol !== mySymbol){
    statusLine.textContent = "Not your turn";
    return;
  }

  // game phases: placing / converting are stored in onlineIsPlacing / onlineIsFirstMove
  if(onlineIsPlacing){
    if(onlineBoard[row][col] === ''){
      onlineBoard[row][col] = mySymbol;
      // update flags
      if(onlineIsFirstMove){
        onlineIsFirstMove = false;
        // switch current player to opponent
        currentPlayerSymbol = (mySymbol === player1Sym ? player2Sym : player1Sym);
      } else {
        // after placing normally, go to convert phase for next player
        onlineIsPlacing = false;
        currentPlayerSymbol = (mySymbol === player1Sym ? player2Sym : player1Sym);
      }
      // push full state to firebase
      update(ref(db, 'games/'+currentGameId), {
        board: onlineBoard,
        currentPlayer: currentPlayerSymbol,
        isPlacing: onlineIsPlacing,
        isFirstMove: onlineIsFirstMove,
        gameOver: onlineGameOver
      });
      renderOnlineBoard();
      return;
    } else {
      statusLine.textContent = 'Cell not empty';
      return;
    }
  } else {
    // convert enemy stone
    if(onlineBoard[row][col] && onlineBoard[row][col] !== mySymbol){
      onlineBoard[row][col] = mySymbol;
      // end convert phase: next player places
      onlineIsPlacing = true;
      currentPlayerSymbol = (mySymbol === player1Sym ? player2Sym : player1Sym);
      // update state
      update(ref(db, 'games/'+currentGameId), {
        board: onlineBoard,
        currentPlayer: currentPlayerSymbol,
        isPlacing: onlineIsPlacing,
        isFirstMove: onlineIsFirstMove,
        gameOver: onlineGameOver
      });
      renderOnlineBoard();
      return;
    } else {
      statusLine.textContent = 'Select an enemy stone to convert';
      return;
    }
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
