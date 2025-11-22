// MorpSCRIPT_local.js
// Local game logic + global helpers (non-module)

let player1Symbol = '⚪';
let player2Symbol = '⚫';
let currentPlayer = player1Symbol;
let board = Array(4).fill(null).map(()=>Array(4).fill(''));
let gameOver = false;
let isPlacing = true;
let isFirstMove = true;

const boardElement = document.getElementById('board');
const messageElement = document.getElementById('message');
const resetButton = document.getElementById('resetButton');

function renderBoardLocal() {
  boardElement.innerHTML = '';
  board.forEach((row,r)=>{
    row.forEach((cell,c)=>{
      const div = document.createElement('div');
      div.className = 'cell';
      div.textContent = cell;
      div.onclick = () => handleCellClickLocal(r,c);
      boardElement.appendChild(div);
    });
  });
}

function handleCellClickLocal(row,col){
  if(gameOver) return;

  if(isPlacing){
    if(board[row][col]===''){
      board[row][col] = currentPlayer;
      renderBoardLocal();
      checkWinnerLocal();
      if(gameOver) return;
      if(isFirstMove){
        isFirstMove = false;
        currentPlayer = player2Symbol;
        messageElement.textContent = `Player ${currentPlayer}, place a stone or convert an enemy.`;
      } else {
        isPlacing = false;
        messageElement.textContent = `Player ${currentPlayer}, select an enemy stone to convert.`;
      }
    }
  } else {
    if(board[row][col] && board[row][col] !== currentPlayer){
      board[row][col] = currentPlayer;
      renderBoardLocal();
      checkWinnerLocal();
      if(gameOver) return;
      isPlacing = true;
      currentPlayer = (currentPlayer === player1Symbol) ? player2Symbol : player1Symbol;
      messageElement.textContent = `Player ${currentPlayer}, place a stone.`;
    } else {
      messageElement.textContent = 'Select an enemy stone to convert.';
    }
  }
}

function checkWinnerLocal(){
  for(let i=0;i<4;i++){
    for(let j=0;j<4;j++){
      if(checkLine(i,j)){
        gameOver = true;
        messageElement.textContent = `Player ${currentPlayer} wins!`;
        return;
      }
    }
  }
  if(board.flat().every(cell=>cell !== '')){
    gameOver = true;
    messageElement.textContent = 'Draw!';
  }
}

function checkLine(row,col){
  const p = board[row][col];
  if(!p) return false;
  return (
    (col <= 0 && board[row][col+1] === p && board[row][col+2] === p && board[row][col+3] === p) ||
    (row <= 0 && board[row+1][col] === p && board[row+2][col] === p && board[row+3][col] === p) ||
    (row <= 0 && col <= 0 && board[row+1][col+1] === p && board[row+2][col+2] === p && board[row+3][col+3] === p) ||
    (row <= 0 && col >= 3 && board[row+1][col-1] === p && board[row+2][col-2] === p && board[row+3][col-3] === p)
  );
}

resetButton.onclick = () => {
  board = Array(4).fill(null).map(()=>Array(4).fill(''));
  currentPlayer = player1Symbol;
  gameOver = false;
  isPlacing = true;
  isFirstMove = true;
  messageElement.textContent = `Player ${currentPlayer}, place a stone.`;
  renderBoardLocal();
};

function startGameLocal(){
  const p1 = document.getElementById('player1Input').value.trim();
  const p2 = document.getElementById('player2Input').value.trim();
  player1Symbol = p1 !== '' ? p1 : '⚪';
  player2Symbol = p2 !== '' ? p2 : '⚫';
  if(player1Symbol === player2Symbol){ alert("Symbols must be different!"); return; }
  currentPlayer = player1Symbol;
  messageElement.textContent = `Player ${currentPlayer}, place a stone.`;
  renderBoardLocal();
  showPage('Game');
}

// Global page switch (module code can't access window onclicks unless global)
function showPage(pageId){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
}
window.showPage = showPage;
window.startGame = startGameLocal; // allow HTML button to call startGame()
renderBoardLocal();
