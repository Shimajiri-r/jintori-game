const boardElement = document.getElementById('board');
const messageElement = document.getElementById('message');
const boardRows = 8; // 縦のマス数 (行): 2つのゴール列 + 6列のプレイエリア = 8
const boardCols = 5; // 横のマス数 (列): 変わらず5
let board = Array(boardRows).fill(null).map(() => Array(boardCols).fill(null));
let currentPlayer = 1;
let selectedPiece = null;

// 初期配置
function initializeBoard() {
    // 盤面をnullで初期化し直す（リセット機能用にも有効）
    board = Array(boardRows).fill(null).map(() => Array(boardCols).fill(null));

    for (let i = 0; i < boardCols; i++) {
        // プレイヤー1の初期配置: 盤面の下から2番目の行 (row = boardRows - 2 = 6)
        board[boardRows - 2][i] = [1];
        // プレイヤー2の初期配置: 盤面の上から2番目の行 (row = 1)
        board[1][i] = [2];
    }
}

// 盤面を描画
function renderBoard() {
    boardElement.innerHTML = '';
    for (let row = 0; row < boardRows; row++) {
        for (let col = 0; col < boardCols; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;

            // ゴールラインの視覚的表示を追加
            if (row === 0) { // 一番上の行はプレイヤー1のゴールライン
                cell.classList.add('goal-line-p1');
            } else if (row === boardRows - 1) { // 一番下の行はプレイヤー2のゴールライン
                cell.classList.add('goal-line-p2');
            }

            const stack = board[row][col];
            if (stack && stack.length > 0) {
                // stack配列を前からループし、それぞれのコマをHTMLに追加
                // CSSの position: absolute で重ね方を調整する
                for (let i = 0; i < stack.length; i++) { // 通常順でループ (0からstack.length-1)
                    const player = stack[i]; // i番目のプレイヤーを取得
                    const piece = document.createElement('div');
                    piece.classList.add('stacked-piece'); // 新しいクラス名を使用
                    piece.classList.add(player === 1 ? 'player1-stacked' : 'player2-stacked');
                    piece.textContent = player; // コマの数字（プレイヤー番号）
                    
                    const pieceHeight = 40; // .stacked-piece の高さ (CSSと合わせる)
                    const overlapOffset = 15; // コマが重なる量 (px)
                    
                    // 重ねる位置を計算 (一番下のコマがセルの下端に、そこから上に重なるように)
                    // (セルの高さ - コマの高さ) - (スタックの深さ - 1 - 現在のコマのインデックス) * 重ねる量
                    piece.style.bottom = `${i * overlapOffset}px`; // 下から積み上げる
                    
                    // z-index は、下のコマが低い値、上のコマが高い値になるようにする
                    piece.style.zIndex = i + 1; 
                    
                    cell.appendChild(piece); // cell に直接追加 (stackElementは不要に)
                }
            }

            cell.addEventListener('click', handleCellClick);
            boardElement.appendChild(cell);
        }
    }
}

function handleCellClick(event) {
    let targetCellElement = event.target;
    while (targetCellElement && !targetCellElement.classList.contains('cell')) {
        targetCellElement = targetCellElement.parentNode;
    }

    if (!targetCellElement) {
        console.error("クリックされた要素が有効なセルではありません。", event.target);
        return;
    }

    const row = parseInt(targetCellElement.dataset.row);
    const col = parseInt(targetCellElement.dataset.col);

    const clickedCell = board[row][col];

    if (selectedPiece) {
        const [fromRow, fromCol] = selectedPiece;
        const pieceOnTop = board[fromRow][fromCol][board[fromRow][fromCol].length - 1];

        // 移動元のコマが現在のプレイヤーのもので、かつ有効な移動である場合
        if (pieceOnTop === currentPlayer && isValidMove(fromRow, fromCol, row, col)) {
            // 移動先にコマがある場合 (重ねる)
            if (clickedCell) {
                if (clickedCell.length < 3) { // 3段までしか重ねられないルール
                    board[row][col].push(currentPlayer);
                    board[fromRow][fromCol].pop();
                    if (board[fromRow][fromCol].length === 0) {
                        board[fromRow][fromCol] = null;
                    }
                    switchPlayer();
                } else {
                    setMessage("3段までしか重ねられません。");
                }
            } else {
                // 移動先が空の場合 (そのまま移動)
                board[row][col] = [currentPlayer];
                board[fromRow][fromCol].pop();
                if (board[fromRow][fromCol].length === 0) {
                    board[fromRow][fromCol] = null;
                }
                switchPlayer();
            }
            selectedPiece = null;
            renderBoard();        // 盤面を再描画
            checkWinCondition(); // 移動後に勝利判定
        } else {
            // setMessage は isValidMove で表示されるので、ここでは一般的な不正メッセージのみ
            if (messageElement.textContent.includes("選択中のコマ") || !messageElement.textContent) {
                 setMessage("不正な移動です。コマの移動範囲やルールを確認してください。");
            }
            selectedPiece = null;
        }
    } else if (clickedCell && clickedCell[clickedCell.length - 1] === currentPlayer) {
        selectedPiece = [row, col];
        setMessage("選択中のコマ: (" + row + ", " + col + ")。移動先をクリックしてください。");
    } else {
        setMessage("自分のコマを選択してください。");
    }
}

// 有効な移動（斜めを含む隣接1マス）かどうかの判定
function isValidMove(fromRow, fromCol, toRow, toCol) {
    const dr = Math.abs(toRow - fromRow);
    const dc = Math.abs(toCol - fromCol);

    // 1. 基本的な移動範囲チェック（前後左右斜め1マス）
    if (!(dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0))) {
        setMessage("隣接するマスに1マスのみ移動できます。");
        return false;
    }

    // 2. 自分のゴールラインへの移動禁止
    if (currentPlayer === 1) { // プレイヤー1の場合
        // プレイヤー1のゴールラインは一番下の行 (boardRows - 1 = 7)
        if (toRow === boardRows - 1) {
            setMessage("自分のゴールラインへは移動できません。");
            return false;
        }
    } else if (currentPlayer === 2) { // プレイヤー2の場合
        // プレイヤー2のゴールラインは一番上の行 (0)
        if (toRow === 0) {
            setMessage("自分のゴールラインへは移動できません。");
            return false;
        }
    }

    return true; // 上記の不正な条件に当てはまらなければ有効な移動
}

function switchPlayer() {
    currentPlayer = 3 - currentPlayer; // 1 <-> 2
    setMessage("現在のプレイヤー: " + currentPlayer + "の番です。");
}

function checkWinCondition() {
    // ゴール判定
    // プレイヤー1のコマがrow 0 (一番上のゴールライン) に到達したら勝利
    for (let i = 0; i < boardCols; i++) {
        if (board[0][i] && board[0][i].includes(1)) {
            setMessage("プレイヤー1の勝利！ (ゴール到達)");
            disableBoard();
            return;
        }
    }

    // プレイヤー2のコマがrow boardRows - 1 (一番下のゴールライン) に到達したら勝利
    for (let i = 0; i < boardCols; i++) {
        if (board[boardRows - 1][i] && board[boardRows - 1][i].includes(2)) {
            setMessage("プレイヤー2の勝利！ (ゴール到達)");
            disableBoard();
            return;
        }
    }

    // ロック判定（簡易版）
    let p1HasMovablePieces = false;
    let p2HasMovablePieces = false;

    for (let r = 0; r < boardRows; r++) {
        for (let c = 0; c < boardCols; c++) {
            const stack = board[r][c];
            if (stack && stack.length > 0) {
                const topPiece = stack[stack.length - 1]; // 最上段のコマ

                if (topPiece === 1) {
                    p1HasMovablePieces = true;
                }
                if (topPiece === 2) {
                    p2HasMovablePieces = true;
                }
            }
        }
    }

    // プレイヤー2が動かせるコマが一つもなければプレイヤー1のロック勝利
    if (!p2HasMovablePieces) {
        setMessage("プレイヤー1によるロック！プレイヤー1の勝利！");
        disableBoard();
        return;
    }
    // プレイヤー1が動かせるコマが一つもなければプレイヤー2のロック勝利
    if (!p1HasMovablePieces) {
        setMessage("プレイヤー2によるロック！プレイヤー2の勝利！");
        disableBoard();
        return;
    }
}

function setMessage(msg) {
    messageElement.textContent = msg;
}

function disableBoard() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => cell.removeEventListener('click', handleCellClick));
}

// ゲーム開始
initializeBoard();
renderBoard();
setMessage("現在のプレイヤー: " + currentPlayer + "の番です。");