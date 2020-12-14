const gameStates = {
    LOADING: 0,
    MENU: 1,
    INGAME: 2,
    PAUSED: 3
};
const padding = 25;

let dom = {};
let fffForwardFont;
let moveSound;
let fallSound;
let clearSound;
let tritrisSound;
let playSound = true;

let piecesJSON;
let game;
let gameState = gameStates.LOADING;

let pointsHigh = localStorage.getItem('TritrisPointsHigh') || 0;
let linesHigh = localStorage.getItem('TritrisLinesHigh') || 0;

let keyImg = {};

function preload() {
    piecesJSON = loadJSON('assets/pieces.json');
    fffForwardFont = loadFont('assets/fff-forward.ttf');
    moveSound = loadSound('assets/move.wav');
    fallSound = loadSound('assets/fall.wav');
    clearSound = loadSound('assets/clear.wav');
    tritrisSound = loadSound('assets/tritris.wav');

    keyImg.left = loadImage('assets/leftKey.png');
    keyImg.right = loadImage('assets/rightKey.png');
    keyImg.up = loadImage('assets/upKey.png');
    keyImg.down = loadImage('assets/downKey.png');
    keyImg.z = loadImage('assets/zKey.png');
    keyImg.x = loadImage('assets/xKey.png');
}

function setup() {
    gameState = gameStates.MENU;
    createCanvas(windowWidth, windowHeight);
    textFont(fffForwardFont);
    createGame(0);

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

    dom.tutorial = select('#tutorial');
    dom.openTutorial = select('#openTutorial');
    dom.openTutorial.mousePressed(() => {
        dom.tutorial.style('visibility: visible');
    });
    dom.openTutorial = select('#closeTutorial');
    dom.openTutorial.mousePressed(() => {
        dom.tutorial.style('visibility: hidden');
    });

    dom.sound = select('#sound');
    dom.sound.changed(() => {
        if (game) {
            game.playClearSound = false;
            game.playFallSound = false;
            game.playMoveSound = false;
        }
        playSound = !playSound;
    });

    resizeDOM();
    showGame(true);
}

function draw() {
    if (gameState == gameStates.MENU)
        return;

    if (gameState == gameStates.INGAME) {
        game.update();
        showGame(false); //Show the game, (and it's not paused)
        if (!game.alive) {
            setHighScores(game.score, game.lines);
            gameState = gameStates.MENU;
            dom.settingsDiv.show();
        }
    } else if (gameState == gameStates.PAUSED) {
        showGame(true); //If paused, show empty grid
        fill(255);
        stroke(0);
        textSize(30);
        textAlign(CENTER, CENTER);
        text('PAUSED', width/2, height/3);
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

function showGame(paused) {
    let gameWidth = min(width / 2, height / 2) - 2 * padding;
    let gameHeight = gameWidth * (game.h / game.w);
    if (gameHeight > height) {
        gameHeight = height - 2 * padding;
        gameWidth = gameHeight * (game.w / game.h);
    }
    const gameX = width / 2 - gameWidth / 2;
    const gameY = height / 2 - gameHeight / 2;
    game.show(gameX, gameY, gameWidth, gameHeight, paused);
    if (playSound)
        game.playSounds(clearSound, fallSound, moveSound, tritrisSound);

    let keyPosX = gameX + gameWidth + 30;
    let keyPosY = gameY + gameHeight - 50;

    if (keyIsDown(90)) tint(255, 0, 0);
    else noTint();
    image(keyImg.z, keyPosX, keyPosY, 50, 50);

    if (keyIsDown(88)) tint(255, 0, 0);
    else noTint();
    image(keyImg.x, keyPosX + 60, keyPosY, 50, 50);

    if (keyIsDown(LEFT_ARROW)) tint(255, 0, 0);
    else noTint();
    image(keyImg.left, keyPosX + 120, keyPosY, 50, 50);

    if (keyIsDown(DOWN_ARROW)) tint(255, 0, 0);
    else noTint();
    image(keyImg.down, keyPosX + 180, keyPosY, 50, 50);

    if (keyIsDown(UP_ARROW)) tint(255, 0, 0);
    else noTint();
    image(keyImg.up, keyPosX + 180, keyPosY - 60, 50, 50);

    if (keyIsDown(RIGHT_ARROW)) tint(255, 0, 0);
    else noTint();
    image(keyImg.right, keyPosX + 240, keyPosY, 50, 50);
}

function newGame() {
    if (gameState == gameStates.LOADING) return;
    createGame(dom.level.value());
    gameState = gameStates.INGAME;
    dom.settingsDiv.hide();
    dom.tutorial.style('visibility: hidden');
}

function keyPressed() {
    if (keyCode == 13) {
        //Enter key is pressed
        if (gameState == gameStates.INGAME) {
            gameState = gameStates.PAUSED;
            game.redraw = true;
        } else if (gameState == gameStates.PAUSED) {
            gameState = gameStates.INGAME;
            game.redraw = true;
        } else if (gameState == gameStates.MENU) {
            newGame();
        }
    }
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
    showGame(gameState == gameStates.PAUSED);
}
