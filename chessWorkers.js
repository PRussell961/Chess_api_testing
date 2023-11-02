const Chess = require('C:\\Users\\colem\\node_modules\\chess.js').Chess;

function generateChildrenWorker(fen, depth) {
  const chess = new Chess(fen);
  const legalMoves = chess.moves({ verbose: true }).filter(move => {
    // Try making the move and check if it leaves the king in check
    chess.move(move);
    const legal = !chess.inCheck();
    chess.undo(); // Undo the move
    return legal;
  });

  const childrenFENs = [];

  for (const move of legalMoves) {
    chess.move(move);
    childrenFENs.push(chess.fen());
    chess.undo();
  }

  return childrenFENs;
}

module.exports = generateChildrenWorker;