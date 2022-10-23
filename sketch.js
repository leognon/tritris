let settings = {
    oldGraphics: getSavedValue('oldGraphics', false),
    showGridLines: getSavedValue('showGridLines', true),
    showKeys: getSavedValue('showKeys', false),
    showStats: getSavedValue('showStats', false),
    showFlash: getSavedValue('showFlash', true),
    use4Piece: getSavedValue('use4Piece', false),
    pauseOnBlur: getSavedValue('pauseOnBlur', true),
}

const keyboardMap = [ //From https://stackoverflow.com/questions/1772179/get-character-value-from-keycode-in-javascript-then-trim
  '','','','CANCEL','','','HELP','','BACK_SPACE','TAB','','','CLEAR','ENTER','ENTER_SPECIAL','','SHIFT','CONTROL','ALT','PAUSE','CAPS_LOCK','KANA','EISU','JUNJA','FINAL','HANJA','','ESCAPE','CONVERT','NONCONVERT','ACCEPT','MODECHANGE','SPACE','PAGE_UP','PAGE_DOWN','END','HOME','LEFT ARROW','UP ARROW','RIGHT ARROW','DOWN ARROW','SELECT','PRINT','EXECUTE','PRINTSCREEN','INSERT','DELETE','','0','1','2','3','4','5','6','7','8','9','COLON','SEMICOLON','LESS_THAN','EQUALS','GREATER_THAN','QUESTION_MARK','AT','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','OS_KEY','','CONTEXT_MENU','','SLEEP','NUMPAD0','NUMPAD1','NUMPAD2','NUMPAD3','NUMPAD4','NUMPAD5','NUMPAD6','NUMPAD7','NUMPAD8','NUMPAD9','MULTIPLY','ADD','SEPARATOR','SUBTRACT','DECIMAL','DIVIDE','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12','F13','F14','F15','F16','F17','F18','F19','F20','F21','F22','F23','F24','','','','','','','','','NUM_LOCK','SCROLL_LOCK','WIN_OEM_FJ_JISHO','WIN_OEM_FJ_MASSHOU','WIN_OEM_FJ_TOUROKU','WIN_OEM_FJ_LOYA','WIN_OEM_FJ_ROYA','','','','','','','','','','CIRCUMFLEX','EXCLAMATION','DOUBLE_QUOTE','HASH','DOLLAR','PERCENT','AMPERSAND','UNDERSCORE','OPEN_PAREN','CLOSE_PAREN','ASTERISK','PLUS','PIPE','HYPHEN_MINUS','OPEN_CURLY_BRACKET','CLOSE_CURLY_BRACKET','TILDE','','','','','VOLUME_MUTE','VOLUME_DOWN','VOLUME_UP','','','SEMICOLON','EQUALS','COMMA','MINUS','PERIOD','SLASH','BACK_QUOTE','','','','','','','','','','','','','','','','','','','','','','','','','','','OPEN_BRACKET','BACK_SLASH','CLOSE_BRACKET','QUOTE','','META','ALTGR','','WIN_ICO_HELP','WIN_ICO_00','','WIN_ICO_CLEAR','','','WIN_OEM_RESET','WIN_OEM_JUMP','WIN_OEM_PA1','WIN_OEM_PA2','WIN_OEM_PA3','WIN_OEM_WSCTRL','WIN_OEM_CUSEL','WIN_OEM_ATTN','WIN_OEM_FINISH','WIN_OEM_COPY','WIN_OEM_AUTO','WIN_OEM_ENLW','WIN_OEM_BACKTAB','ATTN','CRSEL','EXSEL','EREOF','PLAY','ZOOM','','PA1','WIN_OEM_CLEAR',''
];
let settingControl = null;

function setup() {
    loadData(''); //Load from top level dir

    createCanvas(windowWidth, windowHeight);

    dom.recordsDiv = select('#records');
    dom.recordsDiv.style('visibility: visible');
    setHighScores(0, 0, true); //Sets some default scores

    dom.titleDiv = select('#title');
    dom.titleDiv.style('visibility: visible');

    dom.playDiv = select('#play');
    dom.playDiv.style('visibility: visible');

    dom.level = select('#level'); //Select
    dom.level.value(getSavedValue('startLevel', 0));
    dom.level.changed(() => {
        localStorage.setItem('startLevel', dom.level.value());
    });

    createMenuBox('tutorial', 'openTutorial', 'closeTutorial');
    createMenuBox('changelog', 'openChangelog', 'closeChangelog');
    createMenuBox('settings', 'openSettings', 'closeSettings');

    addCheckbox('oldGraphics');
    addCheckbox('showGridLines');
    addCheckbox('showKeys');
    addCheckbox('showStats');
    addCheckbox('showFlash');
    addCheckbox('use4Piece');
    addCheckbox('pauseOnBlur');
    //addCheckbox('muteBackgroundMusic');

    dom.volume = select('#volume');
    dom.volume.value(volume);
    dom.volume.changed(updateVolume);

    dom.musicVolume = select('#musicVolume');
    dom.musicVolume.value(musicVolume);
    dom.musicVolume.changed(updateVolume);
    updateVolume(); //Set it to be synced with the localStorage saved volume

    showBlankGame();

    resizeDOM();

  window.addEventListener("gamepadconnected", e => {
    if (e.gamepad.buttons.length === 17) {
      gamepad = e.gamepad;
    } else {
      gamepad = null;
    }
  });
  window.addEventListener("gamepaddisconnected", e => {
    gamepad = navigator.getGamepads().length > 0 ? navigator.getGamepads()[navigator.getGamepads().length-1] : null;
  })
}

function finishedLoading() {
    textFont(fffForwardFont);

    dom.newGame = select('#newGame');
    dom.newGame.mousePressed(() => { newGame(false); });
    dom.practiceGame = select('#practiceGame');
    dom.practiceGame.mousePressed(() => { newGame(true); });

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
        settingControl = 'counterClock'; setControl(90);
        settingControl = 'clock'; setControl(88);
        settingControl = 'left'; setControl(37);
        settingControl = 'right'; setControl(39);
        settingControl = 'down'; setControl(40);
        settingControl = 'start'; setControl(13);
        settingControl = 'restart'; setControl(27);
    });

    gameState = gameStates.MENU;
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
    controllerKeyPressed();
    if (gameState == gameStates.INGAME) {
        game.update();
        showGame(false); //Show the game, (and it's not paused)
        if (!game.alive) {
            if (!game.practice)
                setHighScores(game.score, game.lines, true);
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
    if (getComputedStyle(dom.settings.elt).visibility == 'visible')
        return; //Make sure to not start a game when the settings box is open

    game = createGame(dom.level.value(), practice);
    gameState = gameStates.INGAME;
    dom.playDiv.hide();
    dom.tutorial.style('visibility: hidden');
    dom.changelog.style('visibility: hidden');
    dom.settings.style('visibility: hidden');
}

// Flag to prevent pause/restart spasming
let pauseBuffering = false;

// Essentially `keyPressed()`, but needs to be ran manually for Gamepads
function controllerKeyPressed() {
  if (gamepad != null) {
    // XBox Controls
    if (xboxIsPressed(XBoxControllerMapping.menu) && !pauseBuffering) {
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
      pauseBuffering = true;
      setTimeout(() => { pauseBuffering = false; }, 500);
    } else if(xboxIsPressed(XBoxControllerMapping.share)) {
      if (gameState == gameStates.INGAME) {
	game.updateHistory();
	game.alive = false;
      }
    }
  // TODO Other Control Schemes
  }
}

function keyPressed() {
    if (settingControl != null) {
        setControl(keyCode);
    } else if (isPressed(controls.start)) {
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
    } else if (isPressed(controls.restart)) { //Escape pressed
        if (gameState == gameStates.INGAME) {
            game.updateHistory();
            game.alive = false;
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
function setControl(keyCode) { //When a user presses the key they want to use for that control
    if (keyCode == 20) { //Caps lock allows for auto-das, so it is not allowed
        alert('You cannot use the caps lock key.');
        return;
    }
    dom.controls[settingControl].removeClass('settingControl');
    dom.controls[settingControl].elt.innerText = keyboardMap[keyCode];
    controls[settingControl] = keyCode; //Set the control
    settingControl = null;
    dom.closeSettings.elt.disabled = false;

    localStorage.setItem('controls', JSON.stringify(controls)); //Save the new controls for a later session
}
