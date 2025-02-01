    let currentPlayer = 'X';
    let board = [
        ['', '', '', ''],
        ['', '', '', ''],
        ['', '', '', ''],
        ['', '', '', '']
    ];
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

            if (isFirstMove) {
                isFirstMove = false;
                currentPlayer = 'O';
                messageElement.textContent = `Joueur ${currentPlayer}, place un pion ou convertis un adversaire.`;
            } else {
                isPlacing = false;
                messageElement.textContent = `Joueur ${currentPlayer}, sélectionne un pion adverse à convertir.`;
            }
        }
    } else {
        if (board[row][col] && board[row][col] !== currentPlayer) {
            board[row][col] = currentPlayer;
            isPlacing = true;
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
            renderBoard();
            checkWinner();
            
            if (!gameOver) {
                messageElement.textContent = `Joueur ${currentPlayer}, place un pion.`;
            }
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
				let noncurrentPlayer = currentPlayer === 'X' ? 'O' : 'X'; // Sauvegarde l'autre joueur
                const winner = noncurrentPlayer; // Sauvegarde du joueur avant de le changer
                messageElement.textContent = `Le joueur ${winner} a gagné !`;
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
        board = [
            ['', '', '', ''],
            ['', '', '', ''],
            ['', '', '', ''],
            ['', '', '', '']
        ];
        currentPlayer = 'X';
        gameOver = false;
        isPlacing = true;
        isFirstMove = true;
        messageElement.textContent = `Joueur ${currentPlayer}, place un pion.`;
        renderBoard();
    };

    function showPage(pageId) {
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => page.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
    }

    renderBoard();
