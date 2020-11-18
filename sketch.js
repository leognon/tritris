const gameStates = {
    MENU: 0,
    INGAME: 1,
};
const padding = 25;

let fffForwardFont;
let dom = {};

let piecesJSON;
let game;
let gameState = gameStates.MENU;

function preload() {
    piecesJSON = loadJSON('pieces.json');
    fffForwardFont = loadFont('fff-forward.ttf');
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    textFont(fffForwardFont);
    createGame(0);
    game.currentPiece.grid = [[]];
    game.nextPiece.grid = [[]]; //Makes no piece display when page first loaded

    dom.titleDiv = select('#title');
    dom.titleDiv.style('visibility: visible');

    dom.settingsDiv = select('#settings');
    dom.settingsDiv.style('visibility: visible');
    dom.triangles = select('#triangles');
    dom.level = select('#level');
    dom.newGame = select('#newGame');
    dom.newGame.mousePressed(() => {
        newGame();
   });

    resizeDOM();
    showGame();
}

function draw() {
    if (gameState == gameStates.MENU) {
    } else {
        game.update();
        showGame();
        if (!game.alive) {
            gameState = gameStates.INGAME;
            dom.settingsDiv.show();
        }
    }
}

function showGame() {
    let gameWidth = min(width / 2, height / 2) - 2 * padding;
    let gameHeight = gameWidth * (game.h / game.w);
    if (gameHeight > height) {
        gameHeight = height - 2 * padding;
        gameWidth = gameHeight * (game.w / game.h);
    }
    const gameX = width / 2 - gameWidth / 2;
    const gameY = height / 2 - gameHeight / 2;
    game.show(gameX, gameY, gameWidth, gameHeight);
}

function newGame() {
    createGame(dom.level.value());
    gameState = gameStates.INGAME;
    dom.settingsDiv.hide();
}

function createGame(level) {
    level = parseInt(level);
    if (isNaN(level)) {
        console.error(level + ' is not a proper level');
        alert('Please select a proper level number');
        return;
    }
    if (level < 0) {
        console.error('Negative level selected');
        alert('Please select a positive level');
        return;
    }
    game = new Game(piecesJSON, level);
}

function resizeDOM() {
    const gameWidth = min(width / 2, height / 2) - 2 * padding;
    const gameHeight = gameWidth * 2;
    const gameX = width / 2 - gameWidth / 2;
    const gameY = height / 2 - gameHeight / 2;
    const cellW = gameWidth / game.w;

    dom.titleDiv.position(10, gameY);
    dom.titleDiv.style(`width: ${gameX - 16 - 10 - cellW}px;`);

    const settingsW = dom.settingsDiv.elt.offsetWidth;
    const settingsH = dom.settingsDiv.elt.offsetHeight;
    dom.settingsDiv.position((width - settingsW) / 2, (height - settingsH) / 2);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    resizeDOM();
    game.redraw = true;
    showGame();
}
