console.log("Script chargé");

let player1Symbol = '❌'; // Symbole par défaut
let player2Symbol = '⭕'; // Symbole par défaut
let currentPlayer = player1Symbol;
let board = Array(4).fill(null).map(() => Array(4).fill(''));
let gameOver = false;
let isPlacing = true;
let isFirstMove = true;

const boardElement = document.getElementById('board');
const messageElement = document.getElementById('message');
const resetButton = document.getElementById('resetButton');
messageElement.textContent = `Joueur ${currentPlayer}, place un pion.`;

function renderBoard() {
    boardElement.innerHTML = '';
    board.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            const cellElement = document.createElement('div');
            cellElement.classList.add('cell');
            cellElement.textContent = cell;
            cellElement.onclick = () => handleCellClick(rowIndex, colIndex);
            boardElement.appendChild(cellElement);
        });
    });
}

function handleCellClick(row, col) {
    if (gameOver) return;

    if (isPlacing) {
        if (board[row][col] === '') {
            board[row][col] = currentPlayer;
            renderBoard();
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
    const player = board[row][col];
    if (!player) return false;

    return (
        (col <= 0 && board[row][col + 1] === player && board[row][col + 2] === player && board[row][col + 3] === player) ||
        (row <= 0 && board[row + 1][col] === player && board[row + 2][col] === player && board[row + 3][col] === player) ||
        (row <= 0 && col <= 0 && board[row + 1][col + 1] === player && board[row + 2][col + 2] === player && board[row + 3][col + 3] === player) ||
        (row <= 0 && col >= 3 && board[row + 1][col - 1] === player && board[row + 2][col - 2] === player && board[row + 3][col - 3] === player)
    );
}

resetButton.onclick = () => {
    board = Array(4).fill(null).map(() => Array(4).fill(''));
    currentPlayer = player1Symbol;
    gameOver = false;
    isPlacing = true;
    isFirstMove = true;
    messageElement.textContent = `Joueur ${currentPlayer}, place un pion.`;
    renderBoard();
};

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

function startGame() {
    let p1Input = document.getElementById('player1Input').value.trim();
    let p2Input = document.getElementById('player2Input').value.trim();
    
    player1Symbol = p1Input !== '' ? p1Input : '❌';
    player2Symbol = p2Input !== '' ? p2Input : '⭕';
    
    if (player1Symbol === player2Symbol) {
        alert("Les symboles doivent être différents !");
        return;
    }

    currentPlayer = player1Symbol;
    messageElement.textContent = `Joueur ${currentPlayer}, place un pion.`;
    renderBoard();
    resetButton.onclick();
    showPage('Game');
}

renderBoard();
