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

let volume = 75;
if (localStorage.hasOwnProperty('volume')) {
    volume = JSON.parse(localStorage.getItem('volume'));
}
let showGridLines = true;
if (localStorage.hasOwnProperty('showGridLines')) {
    showGridLines = JSON.parse(localStorage.getItem('showGridLines'));
}
let showKeys = false;
if (localStorage.hasOwnProperty('showKeys')) {
    showKeys = JSON.parse(localStorage.getItem('showKeys'));
}
let showStats = false;
if (localStorage.hasOwnProperty('showStats')) {
    showStats = JSON.parse(localStorage.getItem('showStats'));
}

let piecesJSON;
let game;
let gameState = gameStates.LOADING;

const keyboardMap = [ //From https://stackoverflow.com/questions/1772179/get-character-value-from-keycode-in-javascript-then-trim
  '','','','CANCEL','','','HELP','','BACK_SPACE','TAB','','','CLEAR','ENTER','ENTER_SPECIAL','','SHIFT','CONTROL','ALT','PAUSE','CAPS_LOCK','KANA','EISU','JUNJA','FINAL','HANJA','','ESCAPE','CONVERT','NONCONVERT','ACCEPT','MODECHANGE','SPACE','PAGE_UP','PAGE_DOWN','END','HOME','LEFT ARROW','UP ARROW','RIGHT ARROW','DOWN ARROW','SELECT','PRINT','EXECUTE','PRINTSCREEN','INSERT','DELETE','','0','1','2','3','4','5','6','7','8','9','COLON','SEMICOLON','LESS_THAN','EQUALS','GREATER_THAN','QUESTION_MARK','AT','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','OS_KEY','','CONTEXT_MENU','','SLEEP','NUMPAD0','NUMPAD1','NUMPAD2','NUMPAD3','NUMPAD4','NUMPAD5','NUMPAD6','NUMPAD7','NUMPAD8','NUMPAD9','MULTIPLY','ADD','SEPARATOR','SUBTRACT','DECIMAL','DIVIDE','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12','F13','F14','F15','F16','F17','F18','F19','F20','F21','F22','F23','F24','','','','','','','','','NUM_LOCK','SCROLL_LOCK','WIN_OEM_FJ_JISHO','WIN_OEM_FJ_MASSHOU','WIN_OEM_FJ_TOUROKU','WIN_OEM_FJ_LOYA','WIN_OEM_FJ_ROYA','','','','','','','','','','CIRCUMFLEX','EXCLAMATION','DOUBLE_QUOTE','HASH','DOLLAR','PERCENT','AMPERSAND','UNDERSCORE','OPEN_PAREN','CLOSE_PAREN','ASTERISK','PLUS','PIPE','HYPHEN_MINUS','OPEN_CURLY_BRACKET','CLOSE_CURLY_BRACKET','TILDE','','','','','VOLUME_MUTE','VOLUME_DOWN','VOLUME_UP','','','SEMICOLON','EQUALS','COMMA','MINUS','PERIOD','SLASH','BACK_QUOTE','','','','','','','','','','','','','','','','','','','','','','','','','','','OPEN_BRACKET','BACK_SLASH','CLOSE_BRACKET','QUOTE','','META','ALTGR','','WIN_ICO_HELP','WIN_ICO_00','','WIN_ICO_CLEAR','','','WIN_OEM_RESET','WIN_OEM_JUMP','WIN_OEM_PA1','WIN_OEM_PA2','WIN_OEM_PA3','WIN_OEM_WSCTRL','WIN_OEM_CUSEL','WIN_OEM_ATTN','WIN_OEM_FINISH','WIN_OEM_COPY','WIN_OEM_AUTO','WIN_OEM_ENLW','WIN_OEM_BACKTAB','ATTN','CRSEL','EXSEL','EREOF','PLAY','ZOOM','','PA1','WIN_OEM_CLEAR',''
];
let controls = {
    counterClock: 90, //Z
    clock: 88, //X
    left: 37, //Left arrow
    down: 40, //Down arrow
    right: 39, //Right arrow
    start: 13, //Enter
    restart: 27, //Escape
    restartFast: 82 //R
}

if (localStorage.hasOwnProperty('controls')) {
    //Load custom controls
    controls = JSON.parse(localStorage.getItem('controls'));
} else {
    //Set default controls
    localStorage.setItem('controls', JSON.stringify(controls));
}

let settingControl = null;

let pointsHigh = localStorage.getItem('TritrisPointsHigh') || 0;
let linesHigh = localStorage.getItem('TritrisLinesHigh') || 0;
let keyImg = {};

function preload() {
    piecesJSON = loadJSON('assets/pieces.json');
    fffForwardFont = loadFont('assets/fff-forward.ttf');
    moveSound = new Sound('assets/move.wav');
    fallSound = new Sound('assets/fall.wav');
    clearSound = new Sound('assets/clear.wav');
    tritrisSound = new Sound('assets/tritris.wav');

    keyImg.left = loadImage('assets/leftKey.png');
    keyImg.right = loadImage('assets/rightKey.png');
    keyImg.down = loadImage('assets/downKey.png');
    keyImg.z = loadImage('assets/zKey.png');
    keyImg.x = loadImage('assets/xKey.png');
}

function setup() {
    gameState = gameStates.MENU;
    createCanvas(windowWidth, windowHeight);
    textFont(fffForwardFont);
    createGame(0);
    game.currentPiece = null;
    game.nextPiece = null;

    dom.recordsDiv = select('#records');
    dom.recordsDiv.style('visibility: visible');
    dom.pointsHigh = select('#pointsHigh');
    dom.linesHigh = select('#linesHigh');
    setHighScores(0, 0); //Sets some default scores

    dom.titleDiv = select('#title');
    dom.titleDiv.style('visibility: visible');

    dom.playDiv = select('#play');
    dom.playDiv.style('visibility: visible');
    dom.level = select('#level');
    if (localStorage.hasOwnProperty('startLevel')) {
        dom.level.value(localStorage.getItem('startLevel'));
    }
    dom.level.changed(() => {
        localStorage.setItem('startLevel', dom.level.value());
    });
    dom.newGame = select('#newGame');
    dom.newGame.mousePressed(() => {
        newGame(false);
    });
    dom.practiceGame = select('#practiceGame');
    dom.practiceGame.mousePressed(() => {
        newGame(true);
    });

    dom.tutorial = select('#tutorial');
    dom.openTutorial = select('#openTutorial');
    dom.openTutorial.mousePressed(() => {
        if (gameState == gameStates.MENU)
            dom.tutorial.style('visibility: visible');
    });
    dom.closeTutorial = select('#closeTutorial');
    dom.closeTutorial.mousePressed(() => {
        dom.tutorial.style('visibility: hidden');
    });

    dom.changelog = select('#changelog');
    dom.openChangelog = select('#openChangelog');
    dom.openChangelog.mousePressed(() => {
        if (gameState == gameStates.MENU)
            dom.changelog.style('visibility: visible');
    });
    dom.closeChangelog = select('#closeChangelog');
    dom.closeChangelog.mousePressed(() => {
        dom.changelog.style('visibility: hidden');
    });

    dom.settings = select('#settings');
    dom.openSettings = select('#openSettings');
    dom.openSettings.mousePressed(() => {
        if (gameState == gameStates.MENU)
            dom.settings.style('visibility: visible');
    });
    dom.closeSettings = select('#closeSettings');
    dom.closeSettings.mousePressed(() => {
        dom.settings.style('visibility: hidden');
    });

    dom.controls = {};
    for (const control in controls) {
        dom.controls[control] = select('#' + control);
        //Make sure control buttons match up with current controls
        dom.controls[control].elt.innerText = keyboardMap[controls[control]];
        dom.controls[control].mousePressed(() => {
            beginSetControl(control); //Create a separate click event for each button
        });
    }
    dom.controls.default = select('#defaultControls');
    dom.controls.default.mousePressed(() => { //Reset all controls to default
        settingControl = setControl('counterClock', 90);
        settingControl = setControl('clock', 88);
        settingControl = setControl('left', 37);
        settingControl = setControl('right', 39);
        settingControl = setControl('down', 40);
        settingControl = setControl('start', 13);
        settingControl = setControl('restart', 27);
        settingControl = setControl('restartFast', 82);
    });

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

    dom.showGridLines = select('#showGridLines');
    dom.showGridLines.checked(showGridLines);
    dom.showGridLines.changed(() => {
        showGridLines = dom.showGridLines.checked();
        localStorage.setItem('showGridLines', showGridLines);
        if (game) {
            game.redraw = true;
            showGame(gameState == gameStates.PAUSED);
        }
    });
    dom.showKeys = select('#showKeys');
    dom.showKeys.checked(showKeys);
    dom.showKeys.changed(() => {
        showKeys = dom.showKeys.checked();
        localStorage.setItem('showKeys', showKeys);
        if (game) {
            game.redraw = true;
            showGame(gameState == gameStates.PAUSED);
        }
    });
    dom.showStats = select('#showStats');
    dom.showStats.checked(showStats);
    dom.showStats.changed(() => {
        showStats = dom.showStats.checked();
        localStorage.setItem('showStats', showStats);
        if (game) {
            game.redraw = true;
            showGame(gameState == gameStates.PAUSED);
        }
    });

    resizeDOM();
    showGame(true);
}

function draw() {
    if (gameState == gameStates.MENU) {
        cursor();
        return;
    }

    if (gameState == gameStates.INGAME) {
        game.update();
        showGame(false); //Show the game, (and it's not paused)
        if (!game.alive) {
            if (!game.practice)
                setHighScores(game.score, game.lines);
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

function setHighScores(score, lines) {
    if (score > pointsHigh) {
        pointsHigh = score;
        localStorage.setItem('TritrisPointsHigh', pointsHigh);
    }
    if (lines > linesHigh) {
        linesHigh = lines;
        localStorage.setItem('TritrisLinesHigh', linesHigh);
    }
    let formattedScore = pointsHigh.toString();
    for (let i = formattedScore.length-3; i > 0; i -= 3) {
        formattedScore = formattedScore.slice(0, i) + " " + formattedScore.slice(i);
    } //Put a space every 3 characters (from the end)
    dom.pointsHigh.elt.innerText = 'Points: ' + formattedScore;
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

    if (gameState == gameStates.INGAME && mouseX > gameX && mouseX < gameX + gameWidth
        && mouseY > gameY && mouseY < gameY + gameHeight) {
        noCursor();
    } else {
        cursor();
    }

    game.show(gameX, gameY, gameWidth, gameHeight, paused, showGridLines, showStats);
    if (volume > 1) //Small buffer to mute sound
        game.playSounds(clearSound, fallSound, moveSound, tritrisSound);

    if (showKeys) {
        const keyPosX = gameX + gameWidth + 30;
        const keyPosY = gameY + gameHeight - 50;

        offset = 0;
        for (key in controls) {
            if (keyIsDown(controls[key])) tint(255, 0, 0);
            else noTint();
            image(keyImg.z, keyPosX + offset, keyPosY, 50, 50);
            offset += 60;
	}
    }
}

function newGame(practice) {
    if (gameState == gameStates.LOADING) return;
    if (getComputedStyle(dom.settings.elt).visibility == 'visible')
        return; //Make sure to not start a game when the settings box is open

    createGame(dom.level.value(), practice);
    gameState = gameStates.INGAME;
    dom.playDiv.hide();
    dom.tutorial.style('visibility: hidden');
    dom.changelog.style('visibility: hidden');
    dom.settings.style('visibility: hidden');
}

function keyPressed() {
    if (settingControl != null) {
        setControl(settingControl, keyCode);
    } else if (keyCode == controls.start) {
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
    } else if (keyCode == controls.restart) { //Escape pressed
        if (gameState == gameStates.INGAME) {
            game.alive = false;
	}
    } else if (keyCode == controls.restartFast) { //R pressed
        if (gameState == gameStates.INGAME) {
            newGame(game.practice);
        }
    }
}

function beginSetControl(control) { //When a user clicks a button to choose the control
    if (settingControl != null) return; //Only set 1 at a time

    settingControl = control;
    dom.controls[settingControl].addClass('settingControl'); //Make it flash
    dom.controls[settingControl].elt.innerText = 'Press a key';
    dom.closeSettings.elt.disabled = true; //They can't close the box while waiting for them to press a key
}
function setControl(setControl, keyCode) { //When a user presses the key they want to use for that control
    dom.controls[setControl].removeClass('settingControl');
    dom.controls[setControl].elt.innerText = keyboardMap[keyCode];
    controls[setControl] = keyCode; //Set the control
    settingControl = null;
    dom.closeSettings.elt.disabled = false;

    localStorage.setItem('controls', JSON.stringify(controls)); //Save the new controls for a later session
}

function createGame(level, practice) {
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
    game = new Game(piecesJSON, level, practice);
}

function resizeDOM() {
    const gameWidth = min(width / 2, height / 2) - 2 * padding;
    const gameHeight = gameWidth * 2;
    const gameX = width / 2 - gameWidth / 2;
    const gameY = height / 2 - gameHeight / 2;
    const cellW = gameWidth / game.w;

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

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    resizeDOM();
    game.redraw = true;
    showGame(gameState == gameStates.PAUSED);
}
