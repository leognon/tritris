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

let volume = getSavedValue('volume', 75);
let settings = {
    oldGraphics: getSavedValue('oldGraphics', false),
    showGridLines: getSavedValue('showGridLines', true),
    showKeys: getSavedValue('showKeys', false),
    showStats: true
}

let piecesJSON;
let piecesImage; //The entire spritesheet
let pieceImages = []; //A 2d array of all the individual triangles
let game;
let gameState = gameStates.LOADING;

let controls = getSavedValue('controls', {
    counterClock: 90, //Z
    clock: 88, //X
    left: 37, //Left arrow
    right: 39, //Right arrow
    down: 40, //Down arrow
    start: 13, //Enter
    restart: 27 //Escape
});

let keyImg = {};

function setup() {
    piecesJSON = loadJSON('../assets/pieces.json', countLoaded);
    fffForwardFont = loadFont('../assets/fff-forward.ttf', countLoaded);

    keyImg.left = loadImage('../assets/leftKey.png', countLoaded);
    keyImg.right = loadImage('../assets/rightKey.png', countLoaded);
    keyImg.down = loadImage('../assets/downKey.png', countLoaded);
    keyImg.z = loadImage('../assets/zKey.png', countLoaded);
    keyImg.x = loadImage('../assets/xKey.png', countLoaded);

    piecesImage = loadImage('../assets/piecesImage.png', () => {
        pieceImages = loadPieces(piecesImage);
        countLoaded();
    });

    moveSound = new Sound('../assets/move.wav');
    fallSound = new Sound('../assets/fall.wav');
    clearSound = new Sound('../assets/clear.wav');
    tritrisSound = new Sound('../assets/tritris.wav');

    createCanvas(windowWidth, windowHeight);

    dom.titleDiv = select('#title');
    dom.titleDiv.style('visibility: visible');

    dom.recordsDiv = select('#records'); //This isn't necessary for comp, but it breaks other code, so just hide it
    dom.recordsDiv.style('visibility: hidden');

    dom.playDiv = select('#play');
    dom.playDiv.style('visibility: visible');

    dom.seed = select('#seed'); //Select
    dom.seed.value(0);

    dom.volume = select('#volume');
    dom.volume.value(volume);
    dom.volume.changed(updateVolume);
    function updateVolume() {
        if (game) {
            game.playClearSound = false;
            game.playFallSound = false;
            game.playMoveSound = false;
        }
        volume = dom.volume.value();
        localStorage.setItem('volume', volume);

        moveSound.setVolume(volume / 100);
        fallSound.setVolume(volume / 100);
        clearSound.setVolume(volume / 100);
        tritrisSound.setVolume(volume / 100);
    };
    updateVolume();


    //An empty piece so the game can render before loading pieces and the images
    let emptyPieceJSON = { pieces: [ { color: 0, pieces: [[[0,0],[0,0]]]  } ] };
    let singleImg = createImage(0,0);
    let emptyImages = [ [singleImg, singleImg, singleImg, singleImg ] ];
    game = new Game(emptyPieceJSON, emptyImages, 0, false, true); //Load a "fake" game to just display the grid
    game.redraw = true;
    showGame(false);

    resizeDOM();
}

function finishedLoading() {
    textFont(fffForwardFont);

    dom.newGame = select('#newGame');
    dom.newGame.mousePressed(() => { newGame(false); });

    gameState = gameStates.MENU;

    game.redraw = true; //Redraw now that keyPresses are loaded
    showGame(false);
}

function draw() {
    if (gameState == gameStates.LOADING) {
        if (loadedAssets < totalAssets) return;
        finishedLoading();
    }
    if (gameState == gameStates.MENU) {
        cursor();
        return;
    }

    if (gameState == gameStates.INGAME) {
        game.update();
        showGame(false); //Show the game, (and it's not paused)
        if (!game.alive) {
            if (!game.practice)
                setHighScores(game.score, game.lines, false);
            gameState = gameStates.MENU;
            dom.playDiv.show();
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

function newGame(practice) {
    if (gameState == gameStates.LOADING) return;

    randomSeed(parseInt(dom.seed.value())); //Set the randomSeed for same piece sets
    game = createGame(9, practice); //Always 9 start in comp
    gameState = gameStates.INGAME;
    dom.playDiv.hide();
}

function keyPressed() {
    if (keyCode == controls.start) {
        //Enter key is pressed
        if (gameState == gameStates.INGAME) {
            gameState = gameStates.PAUSED;
            game.redraw = true;
        } else if (gameState == gameStates.PAUSED) {
            gameState = gameStates.INGAME;
            game.lastFrame = Date.now(); //So the timer doesn't go crazy when pausing
            game.redraw = true;
        } else if (gameState == gameStates.MENU) {
            newGame(false);
        }
    }
}

function saveGame() {
    if (!game) {
        alert('Something went wrong. The game does not exist.');
        return;
    }
    const str = game.toString();
    const fileName = `tritris ${game.score}`;
    const triPercent = (3*game.tritrisAmt/game.lines) || 0;
    const json = {
        'score': game.score,
        'lines': game.lines,
        'time': game.totalTime,
        'triPercent': triPercent,
        'gameData': str
    }

    saveJSON(json, fileName);
}

window.onbeforeunload = () => {
    if (gameState == gameStates.INGAME || gameState == gameStates.PAUSED) {
        return 'Are you sure you want to exit during a game?';
    }
}
