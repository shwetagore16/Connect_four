document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const themeToggle = document.getElementById('theme-toggle');
    const gameBoardEl = document.getElementById('game-board');
    const customCursor = document.getElementById('custom-cursor');
    const winningLineSVG = document.getElementById('winning-line-svg');
    const player1Indicator = document.querySelector('.player1-indicator');
    const player2Indicator = document.querySelector('.player2-indicator');
    const player2Avatar = document.getElementById('player2-avatar');
    const gameModeRadios = document.querySelectorAll('input[name="game-mode"]');
    const aiDifficultySelector = document.getElementById('ai-difficulty-selector');
    const aiDifficultyRadios = document.querySelectorAll('input[name="ai-difficulty-radio"]');
    const resetButton = document.getElementById('reset-game');
    const undoButton = document.getElementById('undo-move');
    const moveHistoryList = document.getElementById('move-history');
    const resultModal = document.getElementById('result-modal');
    const resultMessage = document.getElementById('result-message');
    const playAgainButton = document.getElementById('play-again');
    const dropSound = document.getElementById('drop-sound');
    const winSound = document.getElementById('win-sound');
    const drawSound = document.getElementById('draw-sound');

    // --- Game State ---
    const ROWS = 6;
    const COLS = 7;
    let board = [];
    let moveHistory = [];
    let currentPlayer = 1;
    let gameActive = true;
    let gameMode = 'pvp';
    let aiDifficulty = 'hard';

    // --- Core Functions ---
    const init = () => {
        createBoard();
        setupEventListeners();
        loadTheme();
        resetGame();
    };

    const createBoard = () => {
        gameBoardEl.innerHTML = '';
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                gameBoardEl.appendChild(cell);
            }
        }
    };

    const resetGame = () => {
        board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        moveHistory = [];
        currentPlayer = 1;
        gameActive = true;
        updatePlayerIndicator();
        updateMoveHistory();
        clearWinningLine();
        resultModal.style.display = 'none';
        undoButton.disabled = true;
        // Clear board UI
        Array.from(gameBoardEl.children).forEach(cell => {
            cell.className = 'cell';
        });
    };

    const dropPiece = (col) => {
        if (!gameActive) return;

        let row = -1;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r][col] === 0) {
                row = r;
                break;
            }
        }

        if (row === -1) return; // Column is full

        board[row][col] = currentPlayer;
        moveHistory.push({ row, col, player: currentPlayer });
        playSound(dropSound);

        // UI Updates
        const cell = gameBoardEl.querySelector(`[data-row='${row}'][data-col='${col}']`);
        cell.classList.add(`player${currentPlayer}`);
        updateMoveHistory();

        const winInfo = checkWin(currentPlayer);
        if (winInfo.isWin) {
            endGame(`Player ${currentPlayer} wins!`, winInfo.winningCells, winSound);
            return;
        }

        if (board.every(row => row.every(cell => cell !== 0))) {
            endGame("It's a draw!", [], drawSound);
            return;
        }

        switchPlayer();
    };

    const switchPlayer = () => {
        currentPlayer = currentPlayer === 1 ? 2 : 1;
        updatePlayerIndicator();

        if (gameMode === 'pva' && currentPlayer === 2 && gameActive) {
            setTimeout(aiMove, 500);
        }
    };

    const endGame = (message, winningCells, sound) => {
        gameActive = false;
        playSound(sound);
        if (winningCells.length > 0) {
            drawWinningLine(winningCells);
        }
        setTimeout(() => {
            resultMessage.textContent = message;
            resultModal.style.display = 'flex';
        }, winningCells.length > 0 ? 800 : 100);
    };

    // --- UI & Effects ---
    const updatePlayerIndicator = () => {
        player1Indicator.classList.toggle('active', currentPlayer === 1);
        player2Indicator.classList.toggle('active', currentPlayer === 2);
        undoButton.disabled = !(gameMode === 'pvp' && moveHistory.length > 0 && gameActive);
        // Update custom cursor color
        if (customCursor) {
            const color = currentPlayer === 1 ? 'var(--player1-color)' : 'var(--player2-color)';
            customCursor.style.borderColor = color;
        }
    };

    const updateMoveHistory = () => {
        moveHistoryList.innerHTML = '';
        moveHistory.forEach((move, index) => {
            const li = document.createElement('li');
            li.textContent = `Turn ${index + 1}: Player ${move.player} to column ${move.col + 1}`;
            moveHistoryList.appendChild(li);
        });
        moveHistoryList.scrollTop = moveHistoryList.scrollHeight;
    };

    const drawWinningLine = (cells) => {
        const boardRect = gameBoardEl.getBoundingClientRect();
        const startCell = gameBoardEl.querySelector(`[data-row='${cells[0].r}'][data-col='${cells[0].c}']`);
        const endCell = gameBoardEl.querySelector(`[data-row='${cells[3].r}'][data-col='${cells[3].c}']`);
        
        const startRect = startCell.getBoundingClientRect();
        const endRect = endCell.getBoundingClientRect();

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', startRect.left - boardRect.left + startRect.width / 2);
        line.setAttribute('y1', startRect.top - boardRect.top + startRect.height / 2);
        line.setAttribute('x2', endRect.left - boardRect.left + endRect.width / 2);
        line.setAttribute('y2', endRect.top - boardRect.top + endRect.height / 2);

        winningLineSVG.innerHTML = '';
        winningLineSVG.appendChild(line);
    };

    const clearWinningLine = () => {
        winningLineSVG.innerHTML = '';
    };

    const playSound = (sound) => {
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.error("Error playing sound:", e));
        }
    };

    // --- AI Logic ---
    const aiMove = () => {
        if (!gameActive) return;
        let col;
        if (aiDifficulty === 'easy') {
            col = getRandomMove();
        } else {
            col = findBestMove(2, aiDifficulty === 'hard' ? 4 : 2); // Deeper search for hard
        }
        dropPiece(col);
    };

    const getRandomMove = () => {
        const availableCols = [];
        for (let c = 0; c < COLS; c++) {
            if (board[0][c] === 0) availableCols.push(c);
        }
        return availableCols.length > 0 ? availableCols[Math.floor(Math.random() * availableCols.length)] : null;
    };

    const findBestMove = (player, depth) => {
        // Minimax with alpha-beta pruning would be ideal, but for simplicity, let's do a prioritized search.
        // 1. Find winning move for AI
        for (let c = 0; c < COLS; c++) if (isWinningMove(c, 2)) return c;
        // 2. Block player's winning move
        for (let c = 0; c < COLS; c++) if (isWinningMove(c, 1)) return c;
        // 3. Center preference
        const centerCols = [3, 4, 2, 5, 1, 6, 0];
        for (const c of centerCols) if (board[0][c] === 0) return c;
        return getRandomMove();
    };

    const isWinningMove = (col, player) => {
        if (board[0][col] !== 0) return false;
        let tempRow = -1;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r][col] === 0) { tempRow = r; break; }
        }
        if (tempRow === -1) return false;

        board[tempRow][col] = player;
        const hasWon = checkWin(player).isWin;
        board[tempRow][col] = 0; // backtrack
        return hasWon;
    };

    // --- Game Logic ---
    const checkWin = (player) => {
        // Horizontal, Vertical, Diagonal checks...
        // Returns { isWin: boolean, winningCells: array of {r, c} }
        // Horizontal
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS - 3; c++) {
                if ([0, 1, 2, 3].every(i => board[r][c + i] === player)) {
                    return { isWin: true, winningCells: [0, 1, 2, 3].map(i => ({ r, c: c + i })) };
                }
            }
        }
        // Vertical
        for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS - 3; r++) {
                if ([0, 1, 2, 3].every(i => board[r + i][c] === player)) {
                    return { isWin: true, winningCells: [0, 1, 2, 3].map(i => ({ r: r + i, c })) };
                }
            }
        }
        // Diagonal (down-right)
        for (let r = 0; r < ROWS - 3; r++) {
            for (let c = 0; c < COLS - 3; c++) {
                if ([0, 1, 2, 3].every(i => board[r + i][c + i] === player)) {
                    return { isWin: true, winningCells: [0, 1, 2, 3].map(i => ({ r: r + i, c: c + i })) };
                }
            }
        }
        // Diagonal (up-right)
        for (let r = 3; r < ROWS; r++) {
            for (let c = 0; c < COLS - 3; c++) {
                if ([0, 1, 2, 3].every(i => board[r - i][c + i] === player)) {
                    return { isWin: true, winningCells: [0, 1, 2, 3].map(i => ({ r: r - i, c: c + i })) };
                }
            }
        }
        return { isWin: false, winningCells: [] };
    };

    const handleUndo = () => {
        if (gameMode !== 'pvp' || moveHistory.length === 0 || !gameActive) return;

        const lastMove = moveHistory.pop();
        board[lastMove.row][lastMove.col] = 0;

        const cell = gameBoardEl.querySelector(`[data-row='${lastMove.row}'][data-col='${lastMove.col}']`);
        cell.className = 'cell';

        switchPlayer(); // This will switch back to the player who made the move
        updateMoveHistory();
    };

    // --- Event Listeners ---
    const setupEventListeners = () => {
        themeToggle.addEventListener('change', toggleTheme);
        const boardWrapper = document.querySelector('.game-board-wrapper');
        boardWrapper.addEventListener('mousemove', (e) => {
            const rect = boardWrapper.getBoundingClientRect();
            customCursor.style.left = `${e.clientX - rect.left}px`;
            customCursor.style.top = `${e.clientY - rect.top}px`;
        });

        boardWrapper.addEventListener('mouseenter', () => {
            customCursor.style.display = 'block';
        });

        boardWrapper.addEventListener('mouseleave', () => {
            customCursor.style.display = 'none';
        });

        gameBoardEl.addEventListener('click', (e) => {
            if (!gameActive || (gameMode === 'pva' && currentPlayer === 2)) return;
            if (e.target.classList.contains('cell')) {
                dropPiece(parseInt(e.target.dataset.col));
            }
        });
        resetButton.addEventListener('click', resetGame);
        playAgainButton.addEventListener('click', resetGame);
        undoButton.addEventListener('click', handleUndo);

        gameModeRadios.forEach(radio => radio.addEventListener('change', (e) => {
            gameMode = e.target.value;
            aiDifficultySelector.classList.toggle('hidden', gameMode !== 'pva');
            
            // Dynamically change Player 2 avatar
            if (gameMode === 'pva') {
                player2Avatar.innerHTML = '<i class="fa-solid fa-robot"></i>';
            } else {
                player2Avatar.innerHTML = '<i class="fa-solid fa-user"></i>';
            }

            resetGame();
        }));

        aiDifficultyRadios.forEach(radio => radio.addEventListener('change', (e) => {
            if (e.target.checked) {
                aiDifficulty = e.target.value;
                resetGame();
            }
        }));
    };

    // --- Theme Management ---
    const toggleTheme = () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    };

    const loadTheme = () => {
        const theme = localStorage.getItem('theme');
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.checked = true;
        }
    };

    // --- Initialize ---
    init();
});
