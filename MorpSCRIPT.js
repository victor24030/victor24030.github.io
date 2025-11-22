// ==== VARIABLES DE JEU ====
let player1Symbol = '⚪';
let player2Symbol = '⚫';
let currentPlayer = player1Symbol;
let board = Array(4).fill(null).map(() => Array(4).fill(''));
let gameOver = false;
let isPlacing = true;
let isFirstMove = true;
let loadingInterval;

// ==== FIREBASE MODULE ====
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, set, update, get, onValue } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const firebaseConfig = { apiKey: "AIzaSyBqqD76xaN30m4eqVbUDFqXMrIdsv3ihII", authDomain: "tiktactoe-1e4d9.firebaseapp.com", projectId: "tiktactoe-1e4d9", storageBucket: "tiktactoe-1e4d9.firebasestorage.app", messagingSenderId: "240419840590", appId: "1:240419840590:web:aa5f7fde9dbf45ea4e591f", measurementId: "G-1X7X2KPQ1H" };
const app = initializeApp(firebaseConfig); // 🔹 après config
const db = getDatabase(app);              // 🔹 après init

// ==== DOM ELEMENTS ====
const boardElement = document.getElementById('board');
const messageElement = document.getElementById('message');
const resetButton = document.getElementById('resetButton');

// Online
const uid = Math.random().toString(36).substring(2, 10);
let currentGame = null;
const onlineMsg = document.getElementById("onlineMessage");
const findButton = document.getElementById("findMatchButton");

// ==== RENDER BOARD ====
function renderBoard() {
    boardElement.innerHTML = '';
    board.forEach((row, r) => {
        row.forEach((cell, c) => {
            const div = document.createElement('div');
            div.classList.add('cell');
            div.textContent = cell;
            div.onclick = () => handleCellClick(r, c);
            boardElement.appendChild(div);
        });
    });
}

// ==== HANDLE CLICK ====
function handleCellClick(row, col) {
    if (gameOver) return;

    if (isPlacing) {
        if (board[row][col] === '') {
            board[row][col] = currentPlayer;
            renderBoard();
            if(currentGame) updateOnlineBoard();
            checkWinner();
            if (gameOver) return;

            if (isFirstMove) {
                isFirstMove = false;
                currentPlayer = player2Symbol;
                messageElement.textContent = `Joueur ${currentPlayer}, place un pion ou convertis un adversaire.`;
            } else {
                isPlacing = false;
                messageElement.textContent = `Joueur ${currentPlayer}, sélectionne un pion adverse à convertir.`;
            }
        }
    } else {
        if (board[row][col] && board[row][col] !== currentPlayer) {
            board[row][col] = currentPlayer;
            renderBoard();
            if(currentGame) updateOnlineBoard();
            checkWinner();
            if (gameOver) return;
            isPlacing = true;
            currentPlayer = currentPlayer === player1Symbol ? player2Symbol : player1Symbol;
            messageElement.textContent = `Joueur ${currentPlayer}, place un pion.`;
        } else {
            messageElement.textContent = 'Sélectionnez un pion adverse à convertir.';
        }
    }
}

// ==== CHECK WINNER ====
function checkWinner() {
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if (checkLine(i, j)) {
                gameOver = true;
                messageElement.textContent = `Le joueur ${currentPlayer} a gagné !`;
                return;
            }
        }
    }
    if (board.flat().every(cell => cell !== '')) {
        gameOver = true;
        messageElement.textContent = 'Match nul !';
    }
}

function checkLine(row, col) {
    const p = board[row][col];
    if(!p) return false;
    return (
        (col <= 0 && board[row][col+1]===p && board[row][col+2]===p && board[row][col+3]===p) ||
        (row <= 0 && board[row+1][col]===p && board[row+2][col]===p && board[row+3][col]===p) ||
        (row <= 0 && col <=0 && board[row+1][col+1]===p && board[row+2][col+2]===p && board[row+3][col+3]===p) ||
        (row <= 0 && col >= 3 && board[row+1][col-1]===p && board[row+2][col-2]===p && board[row+3][col-3]===p)
    );
}

// ==== RESET ====
resetButton.onclick = () => {
    board = Array(4).fill(null).map(() => Array(4).fill(''));
    currentPlayer = player1Symbol;
    gameOver = false;
    isPlacing = true;
    isFirstMove = true;
    messageElement.textContent = `Joueur ${currentPlayer}, place un pion.`;
    renderBoard();
};

// ==== START LOCAL GAME ====
function startGame() {
    const p1 = document.getElementById('player1Input').value.trim();
    const p2 = document.getElementById('player2Input').value.trim();
    player1Symbol = p1 !== '' ? p1 : '⚪';
    player2Symbol = p2 !== '' ? p2 : '⚫';
    if(player1Symbol === player2Symbol){ alert("Les symboles doivent être différents !"); return; }
    currentPlayer = player1Symbol;
    messageElement.textContent = `Joueur ${currentPlayer}, place un pion.`;
    renderBoard();
    resetButton.onclick();
    showPage('Game');
}

// ==== ONLINE MATCHMAKING ====
findButton.onclick = () => findMatch();

function findMatch() {
    onlineMsg.textContent = "En attente d'un adversaire";
startLoadingAnimation();
    const waitingRef = ref(db, "waitingPlayer");

    get(waitingRef).then(snapshot => {
        const waiting = snapshot.val();
        if(waiting && waiting !== uid){
            // Match trouvé
            const gameId = Math.random().toString(36).substring(2,8);
            set(ref(db, "games/"+gameId), {
                board: Array(4).fill(null).map(()=>Array(4).fill('')),
                currentPlayer: '⚪',
                player1: waiting,
                player2: uid
            });
            set(waitingRef, null);
            onlineMsg.textContent = "Adversaire trouvé ! Partie commencée.";
            startGameOnline(gameId);
        } else {
            // personne n'attend
            set(waitingRef, uid);
            onlineMsg.textContent = "En attente d'un adversaire...";
            onValue(waitingRef, snap=>{
                if(snap.val() !== uid){
                    get(ref(db, "games")).then(gamesSnap=>{
                        const games = gamesSnap.val();
                        if(!games) return;
                        const gameId = Object.keys(games).find(k => games[k].player2===uid);
                        if(gameId) startGameOnline(gameId);
                    });
                }
            });
        }
    });
}

// ==== START ONLINE GAME ====
function startGameOnline(gameId){
    currentGame = gameId;
    stopLoadingAnimation();
    onlineMsg.textContent = "Adversaire trouvé ! Partie commencée.";

    // 🔹 Crée un plateau vide côté client au démarrage
    board = Array(4).fill(null).map(()=>Array(4).fill(''));
    currentPlayer = '⚪';
    renderBoard();

    // 🔹 Afficher le plateau directement dans l'onglet Online si tu veux
    document.getElementById('Online').appendChild(boardElement);

    // 🔹 Écoute les changements de Firebase
    onValue(ref(db,"games/"+gameId), snapshot=>{
        const data = snapshot.val();
        if(!data) return;
        board = data.board;
        currentPlayer = data.currentPlayer;
        renderBoard();
        messageElement.textContent = `Joueur ${currentPlayer}, à toi !`;
    });
}


// ==== UPDATE ONLINE BOARD ====
function updateOnlineBoard(){
    if(currentGame){
        update(ref(db, "games/"+currentGame), { board, currentPlayer });
    }
}

// ==== PAGE SWITCH ====
function showPage(pageId){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}
window.showPage = showPage;


// ==== DOTS ====
function startLoadingAnimation() {
    const dots = document.getElementById("loadingDots");
    let count = 0;
    loadingInterval = setInterval(() => {
        count = (count + 1) % 4; // 0..3
        dots.textContent = '.'.repeat(count);
    }, 500);
}

function stopLoadingAnimation() {
    clearInterval(loadingInterval);
    document.getElementById("loadingDots").textContent = '';
}


// ==== INITIAL RENDER ====
renderBoard();








