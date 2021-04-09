let settings = {
    oldGraphics: getSavedValue('oldGraphics', false),
    showGridLines: getSavedValue('showGridLines', true),
    showKeys: false, //Inputs are not saved, so there is no point in displaying keyPresses
    showStats: true,
    showFlash: getSavedValue('showFlash', true)
}

const CHANGE_TIME = {
    slider: 0, //Moving the slider
    input: 1, //Typing a number
    not: 2 //Not changing the time (let the game play)
}
let changingTime = CHANGE_TIME.not; //If the user is dragging the time slider

let loadedGameJSON = null;

const fileReader = new FileReader();
fileReader.onload = event => {
    const json = JSON.parse(event.target.result);
    loadedGameJSON = json;
}

function setup() {
    loadData('../'); //Load sounds from parent dir

    createCanvas(windowWidth, windowHeight);

    dom.titleDiv = select('#title');
    dom.titleDiv.style('visibility: visible');

    dom.recordsDiv = select('#records'); //This isn't necessary for replay, but it breaks other code, so just hide it
    dom.recordsDiv.style('visibility: hidden');

    dom.fileInput = select('#fileInput');
    dom.fileInput.changed(() => {
        const files = dom.fileInput.elt.files;
        if (files.length < 1) {
            loadedGameJSON = null;
        } else {
            const file = files[0];
            fileReader.readAsText(file); //Tell the file reader to read the file, which will then store it in loadedGameJSON
        }
    });

    dom.playDiv = select('#play');
    dom.playDiv.style('visibility: visible');

    dom.timeSlider = select('#timeSlider');
    dom.timeSlider.input(() => {
        if (game) {
            game.gotoTime(dom.timeSlider.value() * 1000); //Go to that time in ms
        }
    });
    dom.timeSlider.mousePressed(() => { changingTime = CHANGE_TIME.slider; }); //Keep track of when the user drags the slider
    dom.timeSlider.mouseReleased(() => { changingTime = CHANGE_TIME.not; });

    dom.timeInput = select('#timeInput');
    dom.timeInput.elt.onfocus = () => { changingTime = CHANGE_TIME.input; }; //Keep track of when the user drags the slider
    dom.timeInput.elt.onblur = () => { changingTime = CHANGE_TIME.not; };

    dom.speedInput = select('#speedInput');
    dom.speedInput.input(() => {
        if (game && dom.speedInput.value())
            game.timeSpeed = parseFloat(dom.speedInput.value());
    });

    dom.volume = select('#volume');
    dom.volume.value(volume);
    dom.volume.changed(updateVolume);
    updateVolume();

    resizeDOM();
    showBlankGame();
}

function finishedLoading() {
    textFont(fffForwardFont);

    dom.watchGame = select('#watchGame');
    dom.watchGame.mousePressed(() => { replayGame(); });

    gameState = gameStates.MENU;

    resizeDOM();
    showBlankGame();
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
        if (changingTime == CHANGE_TIME.slider) {
            game.gotoTime(dom.timeSlider.value() * 1000); //Go to that time in ms
        } else if (changingTime == CHANGE_TIME.input) {
            let time = timeToSec(dom.timeInput.value());
            if (time >= 0) //If the time is valid
                game.gotoTime(min(time * 1000, game.maxTime-250));
        } else if (changingTime == CHANGE_TIME.not) {
            dom.timeSlider.value(game.totalTime / 1000); //Automatically move slider to correct time
            dom.timeInput.value(secondsToTime(game.totalTime / 1000));
        }
        game.update();
        showReplay(); //Show the game

        if (!game.alive) {
            gameState = gameStates.MENU;
            dom.playDiv.show();
        }
    } else if (gameState == gameStates.PAUSED) {
        showReplay();
        fill(255);
        stroke(0);
        textSize(30);
        textAlign(CENTER, CENTER);
        text('PAUSED', width/2, height/3);
    }
}

function replayGame() {
    if (gameState == gameStates.LOADING) return;
    if (!loadedGameJSON) {
        alert('Please select a json file to replay!');
        return;
    }

    game = new Replayer(piecesJSON, pieceImages, loadedGameJSON);

    dom.timeSlider.value(0); //Reset the time
    dom.timeSlider.elt.max = Math.floor(game.maxTime/1000); //The slider can be adjusted by seconds
    dom.timeInput.value('00:00');

    game.timeSpeed = parseInt(dom.speedInput.value());

    gameState = gameStates.INGAME;
    dom.playDiv.hide();
}

function showReplay() {
    let gameWidth = min(width / 2, height / 2) - 2 * padding;
    let gameHeight = gameWidth * (game.h / game.w);
    if (gameHeight > height) {
        gameHeight = height - 2 * padding;
        gameWidth = gameHeight * (game.w / game.h);
    }
    const gameX = width / 2 - gameWidth / 2;
    const gameY = height / 2 - gameHeight / 2;

    game.show(gameX, gameY, gameWidth, gameHeight, settings.oldGraphics, settings.showGridLines, settings.showStats, settings.showFlash);
    if (volume > 1 ) //Small buffer to mute sound
        game.playSounds(sounds);
}

function windowResized() { //Overrides resize function
    resizeCanvas(windowWidth, windowHeight);
    resizeDOM();
    if (game) {
        game.redraw = true;
        showReplay();
    } else {
        showBlankGame();
    }
}

function timeToSec(str) { //Convert a string min:sec to totalSeconds
    const min = str.split(':')[0];
    const sec = str.split(':')[1];
    if (!min || !sec) return -1;

    return parseInt(min)*60 + parseInt(sec);
}
function secondsToTime(totalSeconds) {
    totalSeconds = Math.floor(totalSeconds);
    const sec = totalSeconds % 60;
    const min = Math.floor(totalSeconds / 60);
    return twoDig(min) + ':' + twoDig(sec);
}
function twoDig(x) { //Make x 2 digits
    if (x < 10) return '0' + x;
    return x;
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
            //replayGame();
        }
    } else if (keyCode == controls.restart) {
        if (gameState == gameStates.INGAME) {
            game.alive = false;
        }
    }
}
