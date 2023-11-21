
const express = require('express');
const bodyParser = require('body-parser');
const { Chess } = require('chess.js');
const app = require('express')();
const PORT = 8080;

var cors = require('cors')
app.use(cors());
app.use( express.json() );
app.use(express.urlencoded({
    extended:true
}))
app.listen(PORT);

class ChessPositionNode {
    constructor(fen, parent = null) {
      this.fen = fen;
      this.children = [];
      this.parent = parent;
    }
  
    // Add a child node
    addChild(childNode) {
      this.children.push(childNode);
    }
  
    // Generate all possible child nodes using worker threads
    generateChildren(depth) {
      if (depth <= 0) {
        return;
      }
  
      const generateChildrenWorker = require('./chessWorkers'); // Import the worker function
  
      const legalMoves = generateChildrenWorker(this.fen, depth);
  
      for (const fen of legalMoves) {
        const childNode = new ChessPositionNode(fen, this);
        this.addChild(childNode);
        childNode.generateChildren(depth - 1);
      }
    }
  }

  //weights for taking the piece
var weights = { 'p': 100, 'n': 280, 'b': 320, 'r': 479, 'q': 929, 'k': 60000, 'k_e': 60000 };
//weights to give value to positioning on a board. Optimal positioning for certain pieces
var pst_weights = {
  //pawn
  'p':[
    [ 100, 100, 100, 100, 105, 100, 100,  100],
    [  78,  83,  86,  73, 102,  82,  85,  90],
    [   7,  29,  21,  44,  40,  31,  44,   7],
    [ -17,  16,  -2,  15,  14,   0,  15, -13],
    [ -26,   3,  10,   9,   6,   1,   0, -23],
    [ -22,   9,   5, -11, -10,  -2,   3, -19],
    [ -31,   8,  -7, -37, -36, -14,   3, -31],
    [   0,   0,   0,   0,   0,   0,   0,   0]
  ],
  //knight
  'n': [ 
    [-66, -53, -75, -75, -10, -55, -58, -70],
    [ -3,  -6, 100, -36,   4,  62,  -4, -14],
    [ 10,  67,   1,  74,  73,  27,  62,  -2],
    [ 24,  24,  45,  37,  33,  41,  25,  17],
    [ -1,   5,  31,  21,  22,  35,   2,   0],
    [-18,  10,  13,  22,  18,  15,  11, -14],
    [-23, -15,   2,   0,   2,   0, -23, -20],
    [-74, -23, -26, -24, -19, -35, -22, -69]
  ],
  //bishop
  'b': [ 
    [-59, -78, -82, -76, -23,-107, -37, -50],
    [-11,  20,  35, -42, -39,  31,   2, -22],
    [ -9,  39, -32,  41,  52, -10,  28, -14],
    [ 25,  17,  20,  34,  26,  25,  15,  10],
    [ 13,  10,  17,  23,  17,  16,   0,   7],
    [ 14,  25,  24,  15,   8,  25,  20,  15],
    [ 19,  20,  11,   6,   7,   6,  20,  16],
    [ -7,   2, -15, -12, -14, -15, -10, -10]
  ],
  //rook
  'r': [  
    [ 35,  29,  33,   4,  37,  33,  56,  50],
    [ 55,  29,  56,  67,  55,  62,  34,  60],
    [ 19,  35,  28,  33,  45,  27,  25,  15],
    [  0,   5,  16,  13,  18,  -4,  -9,  -6],
    [-28, -35, -16, -21, -13, -29, -46, -30],
    [-42, -28, -42, -25, -25, -35, -26, -46],
    [-53, -38, -31, -26, -29, -43, -44, -53],
    [-30, -24, -18,   5,  -2, -18, -31, -32]
  ],
  //queen
  'q': [   
    [  6,   1,  -8,-104,  69,  24,  88,  26],
    [ 14,  32,  60, -10,  20,  76,  57,  24],
    [ -2,  43,  32,  60,  72,  63,  43,   2],
    [  1, -16,  22,  17,  25,  20, -13,  -6],
    [-14, -15,  -2,  -5,  -1, -10, -20, -22],
    [-30,  -6, -13, -11, -16, -11, -16, -27],
    [-36, -18,   0, -19, -15, -15, -21, -38],
    [-39, -30, -31, -13, -31, -36, -34, -42]
  ],
  //king
  'k': [  
    [  4,  54,  47, -99, -99,  60,  83, -62],
    [-32,  10,  55,  56,  56,  55,  10,   3],
    [-62,  12, -57,  44, -67,  28,  37, -31],
    [-55,  50,  11,  -4, -19,  13,   0, -49],
    [-55, -43, -52, -28, -51, -47,  -8, -50],
    [-47, -42, -43, -79, -64, -32, -29, -32],
    [ -4,   3, -14, -50, -57, -18,  13,   4],
    [ 17,  30,  -3, -14,   6,  -1,  40,  18]
  ]
};

function getScore(move) {
    let score = 0;
  
    // Add the score for the captured piece
    if (move.captured) {
      score += weights[move.captured];
    }
  
    // Add the positional score
    score += pst_weights[move.piece][move.to.charCodeAt(1) - 49][move.to.charCodeAt(0) - 97] -
             pst_weights[move.piece][move.from.charCodeAt(1) - 49][move.from.charCodeAt(0) - 97];
  
    return score;
  }
  
  function determineMove(parentFEN, childFEN) {
    const chess = new Chess(parentFEN);
    const moves = chess.moves({ verbose: true });
  
    for (const move of moves) {
      chess.load(parentFEN);
      chess.move(move);
  
      if (chess.fen() === childFEN) {
        return {
            piece: move.piece,
            from: move.from,
            to: move.to,
            captured: move.captured || null,
            score: getScore(move)
        };
      }
    }
    return null;
  }
  
  // Constants for defining player colors
  const WHITE = 'w';
  const BLACK = 'b';
  
  function minimax(node, depth, isMaximizing, alpha, beta) {
      if (depth === 0 || node.children.length === 0) {
          const chess = new Chess(node.fen);
          return (chess.turn() === WHITE ? 1 : -1) * determineMove(node.parent.fen, node.fen).score;
      }
  
      if (isMaximizing) {
          let maxEval = -Infinity;
          for (const child of node.children) {
              const eval = minimax(child, depth - 1, false, alpha, beta);
              maxEval = Math.max(maxEval, eval);
              alpha = Math.max(alpha, eval);
              if (beta <= alpha) {
                  break;  // alpha-beta pruning
              }
          }
          return maxEval;
      } else {
          let minEval = Infinity;
          for (const child of node.children) {
              const eval = minimax(child, depth - 1, true, alpha, beta);
              minEval = Math.min(minEval, eval);
              beta = Math.min(beta, eval);
              if (beta <= alpha) {
                  break;  // alpha-beta pruning
              }
          }
          return minEval;
      }
  }
  
  function findBestMove(rootNode, depth) {
    const chessInstance = new Chess(rootNode.fen); // Create a new instance here
    const isMaximizing = chessInstance.turn() === WHITE;
    let bestMove = null;
    let bestValue = isMaximizing ? -Infinity : Infinity;
    let bestFEN = null; // Store the best FEN
  
    for (const child of rootNode.children) {
      const currentValue = minimax(child, depth - 1, !isMaximizing, -Infinity, Infinity);
      if (isMaximizing) {
        if (currentValue > bestValue) {
          bestValue = currentValue;
          bestMove = determineMove(rootNode.fen, child.fen);
          bestFEN = child.fen; // Store the FEN of the best move
        }
      } else {
        if (currentValue < bestValue) {
          bestValue = currentValue;
          bestMove = determineMove(rootNode.fen, child.fen);
          bestFEN = child.fen; // Store the FEN of the best move
        }
      }
    }
  
    // Return both the best move and the FEN
    return {
      move: bestMove,
      fen: bestFEN
    };
  }  

app.post('/move', (req,res) => {
const initialFEN = req.body.FEN; // FEN for starting position
const maxDepth = req.body.diff; // Specify the depth of the tree
console.log("Move recieved, starting search with depth" + maxDepth + "... " + initialFEN);
const rootNode = new ChessPositionNode(initialFEN);
rootNode.generateChildren(maxDepth);

// Find the best move
const bestMove = findBestMove(rootNode, maxDepth);

console.log(`Sending: ` + bestMove.fen);

res.send(bestMove.fen);
})