//These are various function that don't fit elsewhere
const gameStates = {
    LOADING: 0,
    MENU: 1,
    INGAME: 2,
    PAUSED: 3
};
const padding = 25;

let piecesJSON;
let piecesImage; //The entire spritesheet
let pieceImages = []; //A 2d array of all the individual triangles
let game;
let gameState = gameStates.LOADING;

let dom = {};
let keyImg = {};
let fffForwardFont;
let volume = getSavedValue('volume', 75);
let controls = getSavedValue('controls', {
    counterClock: 90, //Z
    clock: 88, //X
    left: 37, //Left arrow
    right: 39, //Right arrow
    down: 40, //Down arrow
    start: 13, //Enter
    restart: 27 //Escape
});

const totalAssets = 8;
let loadedAssets = 0;
const countLoaded = () => { loadedAssets++; };
let sounds = {};
function loadData(prefix) { //Depending on the location of the index, it may need to load from the parent dir
    sounds.move = new Sound(prefix + 'assets/move.wav');
    sounds.fall = new Sound(prefix + 'assets/fall.wav');
    sounds.clear = new Sound(prefix + 'assets/clear.wav');
    sounds.tritris = new Sound(prefix + 'assets/tritris.wav');
    sounds.levelup = new Sound(prefix + 'assets/levelup.wav');
    sounds.topout = new Sound(prefix + 'assets/topout.wav');

    piecesJSON = loadJSON(prefix + 'assets/pieces.json', countLoaded);
    fffForwardFont = loadFont(prefix + 'assets/fff-forward.ttf', countLoaded);

    keyImg.left = loadImage(prefix + 'assets/leftKey.png', countLoaded);
    keyImg.right = loadImage(prefix + 'assets/rightKey.png', countLoaded);
    keyImg.down = loadImage(prefix + 'assets/downKey.png', countLoaded);
    keyImg.z = loadImage(prefix + 'assets/zKey.png', countLoaded);
    keyImg.x = loadImage(prefix + 'assets/xKey.png', countLoaded);

    piecesImage = loadImage(prefix + 'assets/piecesImage.png', () => {
        pieceImages = loadPieces(piecesImage);
        countLoaded();
    });
}
function updateVolume() {
    if (game) {
        game.playClearSound = false;
        game.playFallSound = false;
        game.playMoveSound = false;
        game.playLevelupSound = false;
        game.playTopoutSound = false;
    }
    if (dom.volume) {
        volume = dom.volume.value();
        localStorage.setItem('volume', volume);

        for (const sound in sounds) {
            sounds[sound].setVolume(volume / 100);
        }
    }
};

function loadPieces(piecesImage) {
    let pieceImages = []; //A 2d array of each piece color and their rotations
    for (let i = 0; i < 2; i++) { //All of the colors (except white)
        for (let j = 0; j < 3; j++) {
            pieceImages.push(load4Triangles(i, j, piecesImage));
        }
    }
    pieceImages.push(load4Triangles(0, 3, piecesImage)); //The white ninja

    function load4Triangles(i, j, piecesImage) { //Aaaaaah a function inside a function!!!
        const triWidth = piecesImage.width / 8;
        let triangles = [];
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 2; col++) {
                const x = (j*2 + col) * triWidth; //The j*2 is because each set of 4 is a 2x2 square of triangles
                const y = (i*2 + row) * triWidth;
                const imageSlice = piecesImage.get(x, y, triWidth, triWidth);
                triangles.push(imageSlice); //A single rotation
            }
        }
        return triangles;
    }

    return pieceImages;
}

//Modified from https://www.w3schools.com/graphics/game_sound.asp
class Sound {
    constructor(src) {
        this.sound = document.createElement('audio');
        this.sound.src = src;
        this.sound.setAttribute('preload', 'auto');
        this.sound.setAttribute('controls', 'none');
        this.sound.style.display = 'none';
        document.body.appendChild(this.sound);
    }

    setVolume(vol) {
        this.sound.volume = vol;
    }

    play() {
        this.sound.play();
    }
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

    if (gameState == gameStates.INGAME && mouseX > gameX && mouseX < gameX + gameWidth
        && mouseY > gameY && mouseY < gameY + gameHeight) {
        noCursor();
    } else {
        cursor();
    }

    game.show(gameX, gameY, gameWidth, gameHeight, paused, settings.oldGraphics, settings.showGridLines, settings.showStats);
    if (volume > 1) //Small buffer to mute sound
        game.playSounds(sounds);

    if (settings.showKeys && gameState != gameStates.LOADING) {
        const keyPosX = gameX + gameWidth + 30;
        const keyPosY = gameY + gameHeight - 50;

        if (keyIsDown(controls.counterClock)) tint(255, 0, 0);
        else noTint();
        image(keyImg.z, keyPosX, keyPosY, 50, 50);

        if (keyIsDown(controls.clock)) tint(255, 0, 0);
        else noTint();
        image(keyImg.x, keyPosX + 60, keyPosY, 50, 50);

        if (keyIsDown(controls.left)) tint(255, 0, 0);
        else noTint();
        image(keyImg.left, keyPosX + 120, keyPosY, 50, 50);

        if (keyIsDown(controls.down)) tint(255, 0, 0);
        else noTint();
        image(keyImg.down, keyPosX + 180, keyPosY, 50, 50);

        if (keyIsDown(controls.right)) tint(255, 0, 0);
        else noTint();
        image(keyImg.right, keyPosX + 240, keyPosY, 50, 50);

        noTint();
    }
}

function createGame(level, practice) {
    level = parseInt(level);
    if (isNaN(level)) {
        console.error(level + ' is not a proper level');
        alert('Please select a proper level number');
        level = 0; //Default to 0
    }
    if (level < 0) {
        console.error('Negative level selected');
        alert('Please select a positive level');
        level = 0; //Default to 0
    }
    return new Game(piecesJSON, pieceImages, level, practice, false);
}

function setHighScores(score, lines, updateDisplay) {
    let pointsHigh = 0;
    if (localStorage.hasOwnProperty('TritrisPointsHigh')) pointsHigh = parseInt(localStorage.getItem('TritrisPointsHigh'));
    let linesHigh = 0;
    if (localStorage.hasOwnProperty('TritrisLinesHigh')) linesHigh = parseInt(localStorage.getItem('TritrisLinesHigh'));

    if (score > pointsHigh) {
        pointsHigh = score;
        localStorage.setItem('TritrisPointsHigh', pointsHigh);
    }
    if (lines > linesHigh) {
        linesHigh = lines;
        localStorage.setItem('TritrisLinesHigh', linesHigh);
    }

    if (updateDisplay) {
        const formattedScore = formatScore(pointsHigh);
        domPointsHigh = select('#pointsHigh');
        domLinesHigh = select('#linesHigh');

        domPointsHigh.elt.innerText = 'Points: ' + formattedScore;
        domLinesHigh.elt.innerText = 'Lines: ' + linesHigh;
    }
}

function formatScore(score) {
    let normal = score % 100000;
    let dig = Math.floor(score / 100000);
    let formattedScore = normal.toString();
    if (dig > 0) {
        while (formattedScore.length < 5) formattedScore = '0' + formattedScore; //Make sure the length is correct
    }
    for (let i = formattedScore.length-3; i > 0; i -= 3) {
        formattedScore = formattedScore.slice(0, i) + " " + formattedScore.slice(i);
    } //Put a space every 3 characters (from the end)
    if (dig > 0) {
        let str = dig.toString();
        if (dig >= 10 && dig <= 35) str = String.fromCharCode('A'.charCodeAt(0) + dig - 10);
        formattedScore = str + formattedScore;
    }
    return formattedScore;
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    resizeDOM();
    if (game) {
        game.redraw = true;
        showGame(gameState == gameStates.PAUSED);
    }
}

function showBlankGame() { //Display an empty game board while everything is loading
    const gameWidth = min(width / 2, height / 2) - 2 * padding;
    const gameHeight = gameWidth * 2;
    const gameX = width / 2 - gameWidth / 2;
    const gameY = height / 2 - gameHeight / 2;
    const cellW = gameWidth / (game ? game.w : 8);

    //Display the game board
    fill(0);
    noStroke();
    rect(gameX, gameY, gameWidth, gameHeight);

    //Display the score box
    const scorePos = createVector(gameX + gameWidth + cellW, gameY + cellW);
    const textW = 4 * cellW;
    scoreDim = createVector(
        textW + padding + 10,
        20 * 4.5 + padding * 2
    );
    noFill();
    stroke(0);
    strokeWeight(3);
    rect(scorePos.x, scorePos.y, scoreDim.x, scoreDim.y);

    //Display the next piece
    const nextPiecePos = createVector(
        scorePos.x,
        scorePos.y + scoreDim.y + cellW
    );
    const nextPieceDim = createVector(cellW * 3, cellW * 3);
    noFill();
    stroke(0);
    strokeWeight(3);
    rect(nextPiecePos.x, nextPiecePos.y, nextPieceDim.x, nextPieceDim.y);
}

function resizeDOM() {
    const gameWidth = min(width / 2, height / 2) - 2 * padding;
    const gameHeight = gameWidth * 2;
    const gameX = width / 2 - gameWidth / 2;
    const gameY = height / 2 - gameHeight / 2;
    const cellW = gameWidth / (game ? game.w : 8);

    dom.titleDiv.position(10, gameY);
    dom.titleDiv.style(`width: ${gameX - 16 - 10 - cellW}px;`);
    let titleHeight = dom.titleDiv.elt.offsetHeight;
    const maxTitleHeight = height - gameY - dom.recordsDiv.elt.offsetHeight - 30;
    if (titleHeight > maxTitleHeight) {
        dom.titleDiv.style(`height: ${maxTitleHeight}px; overflow-y: scroll`);
        titleHeight = maxTitleHeight;
    } else {
        dom.titleDiv.style('height: auto; overflow-y: hidden');
    }
    titleHeight = dom.titleDiv.elt.offsetHeight; //Recalculate height since it might be auto now

    dom.recordsDiv.position(10, gameY + titleHeight + 10);

    const playW = dom.playDiv.elt.offsetWidth;
    const playH = dom.playDiv.elt.offsetHeight;
    dom.playDiv.position((width - playW) / 2, (height - playH) / 2);
}

function createMenuBox(name, openName, closeName) {
    dom[name] = select(`#${name}`);
    dom[openName] = select(`#${openName}`);
    dom[openName].mousePressed(() => {
        if (gameState == gameStates.MENU) {
            dom[name].style('visibility: visible');
        }
    });
    dom[closeName] = select(`#${closeName}`);
    dom[closeName].mousePressed(() => {
        dom[name].style('visibility: hidden');
    });
}

function getSavedValue(key, defaultVal) {
    if (localStorage.hasOwnProperty(key)) {
        const str = localStorage.getItem(key);
        try { //In case it is an empty string or not JSON
            return JSON.parse(str);
        } catch (e) {
            return str;
        }
    }
    return defaultVal;
}

function addCheckbox(name) {
    dom[name] = select(`#${name}`);
    dom[name].checked(settings[name]); //On page load, make sure it is aligned with the correct value
    dom[name].changed(() => {
        settings[name] = dom[name].checked();
        localStorage.setItem(name, settings[name]);
        if (game) { //Rerender the game to update with the new setting
            game.redraw = true;
            showGame(gameState == gameStates.PAUSED);
        }
    });
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
