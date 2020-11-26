const gameStates = {
    MENU: 0,
    INGAME: 1,
};
const padding = 25;

let fffForwardFont;
let moveSound;
let fallSound;
let clearSound;
let dom = {};

let piecesJSON;
let game;
let gameState = gameStates.MENU;

let pointsHigh = localStorage.getItem('TritrisPointsHigh') || 0;
let linesHigh = localStorage.getItem('TritrisLinesHigh') || 0;

function preload() {
    piecesJSON = loadJSON('assets/pieces.json');
    fffForwardFont = loadFont('assets/fff-forward.ttf');
    moveSound = loadSound('assets/move.wav');
    fallSound = loadSound('assets/fall.wav');
    clearSound = loadSound('assets/clear.wav');
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    textFont(fffForwardFont);
    createGame(0);
    game.currentPiece.grid = [[]];
    game.nextPiece.grid = [[]]; //Makes no piece display when page first loaded

    dom.recordsDiv = select('#records');
    dom.recordsDiv.style('visibility: visible');
    dom.pointsHigh = select('#pointsHigh');
    dom.linesHigh = select('#linesHigh');
    setHighScores(0, 0); //Sets some default scores

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
    if (gameState == gameStates.MENU)
        return;
    game.update();
    showGame();
    if (!game.alive) {
        setHighScores(game.score, game.lines);
        gameState = gameStates.INGAME;
        dom.settingsDiv.show();
    }
}

function setHighScores(score, lines) {
    if (score > pointsHigh) {
        pointsHigh = score;
        localStorage.setItem('TritrisPointsHigh', pointsHigh);
    }
    if (lines > linesHigh) {
        linesHigh = lines;
        localStorage.setItem('TritrisLinesHigh', linesHigh);
    }
    dom.pointsHigh.elt.innerText = 'Points: ' + pointsHigh;
    dom.linesHigh.elt.innerText = 'Lines: ' + linesHigh;
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
    game.playSounds(clearSound, fallSound, moveSound);
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
    const titleHeight = dom.titleDiv.elt.offsetHeight;

    dom.recordsDiv.position(10, gameY + titleHeight + 10);

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
