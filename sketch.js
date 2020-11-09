const padding = 25;
let game;
let pieces3json;
let pieces4json;

let dom = {};


function preload() {
    pieces3json = loadJSON('pieces3.json');
    pieces4json = loadJSON('pieces4.json');
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    newGame(4, 0);

    dom.titleDiv = select('#title');
    dom.titleDiv.style('visibility: visible');

    dom.rulesDiv = select('#rules');
    dom.rulesDiv.style('visibility: visible');

    dom.settingsDiv = select('#settings');
    dom.settingsDiv.style('visibility: visible');
    dom.triangles = select('#triangles');
    dom.level = select('#level');
    dom.newGame = select('#newGame');
    dom.newGame.mousePressed(() => {
        newGame(dom.triangles.value(), dom.level.value());
    });

    resizeDOM();
}

function draw() {
    background(100);
    game.update();
    const gameWidth = min(width / 2, height / 2) - 2 * padding;
    const gameHeight = gameWidth * 2;
    const gameX = width / 2 - gameWidth / 2;
    const gameY = height / 2 - gameHeight / 2;
    game.show(gameX, gameY, gameWidth, gameHeight);
}

function newGame(pieces, level) {
    if (pieces == 3) pieces = pieces3json;
    else if (pieces == 4) pieces = pieces4json;
    else {
        console.error('No traingle amount selected.');
        alert('Please select a correct (3 or 4) amount of triangles.');
        return;
    }
    level = parseInt(level);
    if (level < 0) {
        console.error('Negative level selected');
        alert('Please select a positive level');
        return;
    }
    game = new Game(pieces, level);
}

function resizeDOM() {
    const gameWidth = min(width / 2, height / 2) - 2 * padding;
    const gameHeight = gameWidth * 2;
    const gameX = width / 2 - gameWidth / 2;
    const gameY = height / 2 - gameHeight / 2;
    const cellW = gameWidth / game.w;
    const cellH = gameHeight / game.h;
    const nextBoxPosX = gameX + gameWidth + cellW;
    const nextBoxPosY = gameY + cellH;
    dom.settingsDiv.position(nextBoxPosX, nextBoxPosY + 4*cellH);

    dom.titleDiv.position(10, gameY);
    dom.titleDiv.style(`width: ${gameX - 16 - 10 - cellW}px;`);

    dom.rulesDiv.position(nextBoxPosX, nextBoxPosY + 7*cellH);
    dom.rulesDiv.style(`width: ${width - gameX - gameWidth - cellW - 40}px;`);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    resizeDOM();
}
