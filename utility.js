//These are various function that don't fit elsewhere
const gameStates = {
    LOADING: 0,
    MENU: 1,
    INGAME: 2,
    PAUSED: 3
};
const padding = 25;

const XBoxControllerMapping = {
  faceA: 0,
  faceB: 1,
  faceX: 2,
  faceY: 3,
  bumperL: 4,
  bumperR: 5,
  triggerL: 6,
  triggerR: 7,
  share: 8,
  menu: 9,
  dpadUp: 12,
  dpadDown: 13,
  dpadLeft: 14,
  dpadRight: 15,
}

let piecesJSON;
let piecesImage; //The entire spritesheet
let pieceImages = []; //A 2d array of all the individual triangles
let game;
let gameState = gameStates.LOADING;

let dom = {};
let gamepad = null;
let keyImg = {};
let fffForwardFont;
let volume = getSavedValue('volume', 75);
let musicVolume = getSavedValue('musicVolume', 0);
let controls = getSavedValue('controls', {
    counterClock: 90, //Z
    clock: 88, //X
    left: 37, //Left arrow
    right: 39, //Right arrow
    down: 40, //Down arrow
    start: 13, //Enter
    restart: 27 //Escape
});

// Validation should have already occurred if `gamepad` is non-null
function xboxIsPressed(button) {
  // A value of 0.2 will account for "sticky" triggers
  return gamepad.buttons[button].value > 0.2;
}

function isPressed(keyCode) {
  if (gamepad) {
    switch (keyCode) {
      case controls.counterClock:
	return keyIsDown(keyCode) || xboxIsPressed(XBoxControllerMapping.bumperL) || xboxIsPressed(XBoxControllerMapping.triggerL) || xboxIsPressed(XBoxControllerMapping.faceX);
	break;
      case controls.clock:
	return keyIsDown(keyCode) || xboxIsPressed(XBoxControllerMapping.bumperR) || xboxIsPressed(XBoxControllerMapping.triggerR) || xboxIsPressed(XBoxControllerMapping.faceY)
	break;
      case controls.left:
	return keyIsDown(keyCode) || xboxIsPressed(XBoxControllerMapping.dpadLeft);
	break;
      case controls.right:
	return keyIsDown(keyCode) || xboxIsPressed(XBoxControllerMapping.dpadRight);
	break;
      case controls.down:
	return keyIsDown(keyCode) || xboxIsPressed(XBoxControllerMapping.dpadDown) || xboxIsPressed(XBoxControllerMapping.faceA) || xboxIsPressed(XBoxControllerMapping.faceB);
	break;
      case controls.start:
	return keyIsDown(keyCode) || xboxIsPressed(XBoxControllerMapping.menu);
	break;
      case controls.restart:
	return keyIsDown(keyCode) || xboxIsPressed(XBoxControllerMapping.share);
	break;
      default:
	return false;
    }
  } else {
    return keyIsDown(keyCode);
  }
}

const totalAssets = 9;
let loadedAssets = 0;
const countLoaded = () => { loadedAssets++; };
let sounds = {};

let musicTracks = [];
let musicIsPlaying = false;
let currentTrackIndex = -1; //Starts at -1 so when it is incremented it plays track 0

function loadData(prefix) { //Depending on the location of the index, it may need to load from the parent dir
    sounds.move = new Sound(prefix + 'assets/move.wav');
    sounds.fall = new Sound(prefix + 'assets/fall.wav');
    sounds.clear = new Sound(prefix + 'assets/clear.wav');
    sounds.tritris = new Sound(prefix + 'assets/tritris.wav');
    sounds.levelup = new Sound(prefix + 'assets/levelup.wav');
    sounds.topout = new Sound(prefix + 'assets/topout.wav');

    musicTracks = [
        new MusicTrack('trackA', prefix + 'assets/music/trackA.wav'),
        // Credit to the background music goes to Kevin MacLeod
        // Artist : Kevin MacLeod
        // Title  : EDM Detection Mode
        new MusicTrack('EDM Detection Mode', prefix + 'assets/music/edmDetectionMode.wav'),
        new MusicTrack('Isosceles', prefix + 'assets/music/isosceles.wav')
    ]

    piecesJSON = loadJSON(prefix + 'assets/pieces.json', countLoaded);
    pieces4JSON = loadJSON(prefix + 'assets/4pieces.json', countLoaded); //Quadtris
    fffForwardFont = loadFont(prefix + 'assets/fff-forward.ttf', countLoaded);

    keyImg.left = loadImage(prefix + 'assets/leftKey.png', img => loadedKeyImg(img, 'left'));
    keyImg.right = loadImage(prefix + 'assets/rightKey.png', img => loadedKeyImg(img, 'right'));
    keyImg.down = loadImage(prefix + 'assets/downKey.png', img => loadedKeyImg(img, 'down'));
    keyImg.z = loadImage(prefix + 'assets/zKey.png', img => loadedKeyImg(img, 'z'));
    keyImg.x = loadImage(prefix + 'assets/xKey.png', img => loadedKeyImg(img, 'x'));

    piecesImage = loadImage(prefix + 'assets/piecesImage.png', () => {
        pieceImages = loadPieces(piecesImage);
        countLoaded();
    });
}

function startBackgroundMusic() {
    if (!musicIsPlaying) {
        nextMusicTrack();
        musicIsPlaying = true;
    }
}

function nextMusicTrack() {
    setTimeout(() => {
        currentTrackIndex = (currentTrackIndex + 1) % musicTracks.length;

        musicTracks[currentTrackIndex].play();
        musicTracks[currentTrackIndex].setOnEnd(nextMusicTrack);
    }, 300);
}

function pauseCurrentTrack(p) {
    if (p && musicIsPlaying) { //Should pause and music is current playing
        musicTracks[currentTrackIndex].pause();
        musicIsPlaying = false;
    }
    if (!p && !musicIsPlaying) { //Should unpause and music is not playing
        musicTracks[currentTrackIndex].play();
        musicIsPlaying = true;
    }
}

function loadedKeyImg(img, dir) { //Create a tinted version of the graphic
    countLoaded();

    let g = createGraphics(img.width, img.height);
    g.tint(255, 0, 0); //Apply the red tint (slow operation) once on load
    g.image(img, 0, 0);

    const tintedImg = g.get(); //Get the p5.Image that is now tinted. Drawing this will be fast
    keyImg[dir + 'Pressed'] = tintedImg; //Save it (E.X - keyImg.leftPressed)

    g.remove();
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
    if (dom.musicVolume) {
        musicVolume = dom.musicVolume.value();
        localStorage.setItem('musicVolume', musicVolume);

        let vol = (musicVolume > 1) ? musicVolume / 100 : 0; //Adds a small buffer to mute
        for (const track of musicTracks) {
            track.setVolume(vol);
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

class MusicTrack extends Sound {
    constructor(name, src) {
        super(src);
        this.name = name;
    }

    pause() {
        this.sound.pause();
    }

    setOnEnd(fn) {
        this.sound.onended = fn;
    }
}

function showGame(paused) {
    if (paused) pauseCurrentTrack(true);
    else pauseCurrentTrack(false);

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

    game.show(gameX, gameY, gameWidth, gameHeight, paused, settings.oldGraphics, settings.showGridLines, settings.showStats, settings.showFlash);
    if (volume > 1) //Small buffer to mute sound
        game.playSounds(sounds);

    if (settings.showKeys && gameState != gameStates.LOADING) {
        const keyPosX = gameX + gameWidth + 30;
        const keyPosY = gameY + gameHeight - 50;

        if (keyIsDown(controls.counterClock)) image(keyImg.zPressed, keyPosX, keyPosY, 50, 50);
        else image(keyImg.z, keyPosX, keyPosY, 50, 50);

        if (keyIsDown(controls.clock)) image(keyImg.xPressed, keyPosX + 60, keyPosY, 50, 50);
        else image(keyImg.x, keyPosX + 60, keyPosY, 50, 50);

        if (keyIsDown(controls.left)) image(keyImg.leftPressed, keyPosX + 120, keyPosY, 50, 50);
        else image(keyImg.left, keyPosX + 120, keyPosY, 50, 50);

        if (keyIsDown(controls.down)) image(keyImg.downPressed, keyPosX + 180, keyPosY, 50, 50);
        else image(keyImg.down, keyPosX + 180, keyPosY, 50, 50);

        if (keyIsDown(controls.right)) image(keyImg.rightPressed, keyPosX + 240, keyPosY, 50, 50);
        else image(keyImg.right, keyPosX + 240, keyPosY, 50, 50);
    }
}

function createGame(level, practice) {
    startBackgroundMusic();

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
    let pieceSet = piecesJSON;
    if (settings.use4Piece) pieceSet = pieces4JSON;
    return new Game(pieceSet, pieceImages, level, practice);
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
    } else {
        showBlankGame();
    }
}

function showBlankGame() { //Display an empty game board while everything is loading
    background(100);
    const gameWidth = min(width / 2, height / 2) - 2 * padding;
    const gameHeight = gameWidth * 2;
    const gameX = width / 2 - gameWidth / 2;
    const gameY = height / 2 - gameHeight / 2;
    const cellW = gameWidth / (game ? game.w : 8);
    const cellH = cellW; //Assume cells are a square

    //Display the game board
    fill(0);
    noStroke();
    rect(gameX, gameY, gameWidth, gameHeight);

    if (settings.showGridLines) {
        //Draws the grid outline
        stroke(100);
        strokeWeight(2);
        //Vertical lines
        for (let i = 0; i <= (game ? game.w : 8); i++)
            line(gameX + i * cellW, gameY, gameX + i * cellW, gameY + gameHeight);
        //Horizontal lines
        for (let j = 0; j <= (game ? game.h : 16); j++)
            line(gameX, gameY + j * cellH, gameX + gameWidth, gameY + j * cellH);
    }

    //Display the score box
    const scorePos = createVector(gameX + gameWidth + cellW, gameY + cellW);
    scoreDim = createVector(
        4*cellW + 20,
        110 //These are based on the font size, but its not loaded yet
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

    if (settings.showStats) {
        const statPos = createVector(
            scorePos.x,
            nextPiecePos.y + nextPieceDim.y + cellH
        );
        const statDim = createVector(
            4*cellW + 20,
            20 * 2.75 + 20
        );
        //The box outline
        rect(statPos.x, statPos.y, statDim.x, statDim.y);
    }
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
    dom.recordsDiv.style(`max-width: ${gameX - 16 - 10 - cellW}px;`);

    const playW = dom.playDiv.elt.offsetWidth;
    const playH = dom.playDiv.elt.offsetHeight;
    dom.playDiv.position((width - playW) / 2, (height - playH) / 2);
}

function createMenuBox(name, openName, closeName) {
    dom[name] = select(`#${name}`);
    dom[openName] = select(`#${openName}`);
    dom[openName].mousePressed(() => {
        if (gameState == gameStates.MENU || gameState == gameStates.PAUSED) {
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
        } else {
            showBlankGame();
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

window.onblur = () => {
    //Only pause if they have started the game. The > 10 is to prevent it from instantly pausing after getting the alert() when starting a qual game
    if (settings.pauseOnBlur && gameState == gameStates.INGAME && game && game.totalTime > 10) {
        gameState = gameStates.PAUSED;
        game.redraw = true;
        showGame(true);
    }
};
