//window.location.href = window.location.href.split('comp')[0]; //Instantly redirects to not have the "/comp"
let settings = {
    oldGraphics: getSavedValue('oldGraphics', false),
    showGridLines: getSavedValue('showGridLines', true),
    showKeys: getSavedValue('showKeys', false),
    showStats: true,
    showFlash: getSavedValue('showFlash', true),
    use4Piece: false
}

function setup() {
    loadData('../'); //Load sounds from parent dir

    createCanvas(windowWidth, windowHeight);

    dom.titleDiv = select('#title');
    dom.titleDiv.style('visibility: visible');

    dom.recordsDiv = select('#records'); //This isn't necessary for comp, but it breaks other code, so just hide it
    dom.recordsDiv.style('visibility: hidden');

    dom.playDiv = select('#play');
    dom.playDiv.style('visibility: visible');

    dom.seed = select('#seed'); //Select
    dom.seed.value(0);

    dom.level = select('#level'); //Select
    dom.level.value(9);

    dom.volume = select('#volume');
    dom.volume.value(volume);
    dom.volume.changed(updateVolume);
    updateVolume();

    showBlankGame();

    resizeDOM();
}

function finishedLoading() {
    textFont(fffForwardFont);

    dom.newGame = select('#newGame');
    dom.newGame.mousePressed(() => { newGame(); });

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

function newGame() {
    if (gameState == gameStates.LOADING) return;

    let seed = parseInt(dom.seed.value(), 16); //Set the randomSeed for same piece sets using base 16
    if (isNaN(seed)) {
        alert('Invalid seed!');
        return;
    }
    randomSeed(seed);
    let lvl = parseInt(dom.level.value());
    game = createGame(lvl, false);
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
            newGame();
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
