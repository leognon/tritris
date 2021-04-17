let settings = {
    oldGraphics: getSavedValue('oldGraphics', false),
    showGridLines: getSavedValue('showGridLines', true),
    showKeys: getSavedValue('showKeys', false),
    showStats: true, //Stats are always shown for competitive
    showFlash: getSavedValue('showFlash', true),
    use4Piece: false
}

const month = new Date().getMonth();
const year = new Date().getYear(); //It will be a new set of scores each month
const gameSaveName = `${month}/${year}qual`;
const gameStatus = {
    NOT_STARTED: 0,
    INPROGRESS: 1,
    FINISHED: 2,
    DISCONNECTED: 3 //If they close the page mid-game
};
let games = new Array(5);
for (let i = 0; i < 5; i++) {
    games[i] = {
        score: -1,
        lines: -1,
        startLevel: -1,
        date: -1,
        status: gameStatus.NOT_STARTED
    };
}
let currentGame = 0;
if (localStorage.hasOwnProperty(gameSaveName)) {
    games = JSON.parse(localStorage.getItem(gameSaveName));
    for (let i = 0; i < games.length; i++) {
        if (games[i].status == gameStatus.NOT_STARTED) { //Resume on whichever game they have not started
            currentGame = i;
            break;
        }
        if (i == games.length-1) {
            //All games finished
            currentGame = 5;
        }
    }
} else {
    localStorage.setItem(gameSaveName, JSON.stringify(games));
}

function setup() {
    loadData('../'); //Load from parent dir

    createCanvas(windowWidth, windowHeight);

    dom.recordsDiv = select('#records');
    dom.recordsDiv.style('visibility: visible');

    dom.titleDiv = select('#title');
    dom.titleDiv.style('visibility: visible');

    dom.newGame = select('#newGame');

    dom.playDiv = select('#play');
    dom.playDiv.style('visibility: visible');

    dom.level = select('#level');
    if (localStorage.hasOwnProperty('startLevel')) {
        dom.level.value(localStorage.getItem('startLevel'));
    }
    dom.level.changed(() => {
        localStorage.setItem('startLevel', dom.level.value());
    });

    dom.volume = select('#volume');
    dom.volume.value(volume);
    dom.volume.changed(updateVolume);
    updateVolume();

    dom.games = [];
    for (let i = 0; i < 5; i++) {
        dom.games.push(select('#game' + i));
    }
    dom.avgOf2 = select('#avgOf2');
    dom.levelLabel = select('#levelLabel');

    dom.resetScores = select('#resetScores');
    dom.resetScores.mousePressed(() => {
        if (gameState == gameStates.INGAME || gameState == gameStates.PAUSED) {
            alert('You cannot reset during a game!');
            return;
        }
        if (!confirm('Are you sure you want to reset your scores? This cannot be undone.'))
            return;
        games = new Array(5);
        for (let i = 0; i < 5; i++) {
            games[i] = {
                score: -1,
                lines: -1,
                startLevel: -1,
                date: -1,
                status: gameStatus.NOT_STARTED
            };
        }
        currentGame = 0;
        localStorage.setItem(gameSaveName, JSON.stringify(games));
        updateDisplay();
    });
    updateDisplay();

    showBlankGame();

    resizeDOM();
}

function finishedLoading() {
    textFont(fffForwardFont);

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
        if (!game.alive) { //Game has just ended!
            gameState = gameStates.MENU;
            dom.playDiv.show();

            if (!game.practice)
                setHighScores(game.score, game.lines, false);

            games[currentGame].status = gameStatus.FINISHED;
            games[currentGame].score = game.score;
            games[currentGame].lines = game.lines;
            games[currentGame].startLevel = game.startLevel;
            localStorage.setItem(gameSaveName, JSON.stringify(games));
            currentGame++;

            updateDisplay();
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

function updateDisplay() {
    if (currentGame == 5) {
        dom.levelLabel.elt.innerText = 'Congrats! Your qualification is complete!';
        dom.level.style('visibility: hidden');
        dom.newGame.style('visibility: hidden');
    } else {
        dom.levelLabel.elt.innerText = 'Level: ';
        dom.level.style('visibility: visible');
        dom.newGame.style('visibility: visible');
    }
    for (let i = 0; i < 5; i++) {
        if (gameState == gameStates.INGAME && currentGame == i) {
            dom.games[i].addClass('currentGame');
        } else {
            dom.games[i].removeClass('currentGame');
        }
        if (i < games.length) {
            let gameText = '--';
            if (games[i].status == gameStatus.FINISHED || games[i].status == gameStatus.DISCONNECTED) {
                gameText = formatScore(games[i].score);
            }
            dom.games[i].elt.innerText = `Game ${i+1}: ${gameText}`;
        }
    }
    let scores = games.filter(g => g.score > -1).map(g => g.score).sort((a, b) => b - a);
    if (scores.length >= 2) {
        const avgOf2 = (scores[0] + scores[1]) / 2;
        let formatted = formatScore(Math.floor(avgOf2));
        if (avgOf2 % 1 == 0.5) formatted += '.5';
        dom.avgOf2.elt.innerText = `Qual Score: ${formatted}`;
    } else {
        dom.avgOf2.elt.innerText = `Qual Score: --`;
    }
}

function newGame() {
    if (gameState == gameStates.LOADING) return;
    if (currentGame >= 5) {
        alert('You have already played your 5 games!');
        return;
    }
    const gameNumber = ['first', 'second', 'third', 'fourth', 'fifth'][currentGame];
    let level = parseInt(dom.level.value());
    if (isNaN(level)) level = 0;
    if (level < 0) level = 0;
    if (level > 29) level = 29;
    if (level >= 20 && level <= 28) level = 19; //Can only start on 0-19 or 29
    if (!confirm(`Are you sure you want to start your ${gameNumber} game on level ${level}?`))
        return;

    game = createGame(level, false);
    gameState = gameStates.INGAME;

    games[currentGame].status = gameStatus.INPROGRESS;
    games[currentGame].date = Date.now();
    localStorage.setItem(gameSaveName, JSON.stringify(games));

    updateDisplay();
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
            game.redraw = true;
        } else if (gameState == gameStates.MENU) {
            newGame();
        }
    }
}

window.onbeforeunload = () => {
    if (gameState == gameStates.INGAME || gameState == gameStates.PAUSED) {
        if (currentGame < 5 && games[currentGame].status == gameStatus.INPROGRESS && game) {
            games[currentGame].score = game.score;
            games[currentGame].lines = game.lines;
            games[currentGame].startLevel = game.startLevel;
            games[currentGame].status = gameStatus.DISCONNECTED;
            localStorage.setItem(gameSaveName, JSON.stringify(games));
        }
        return 'Are you sure you want to exit the page during a game? You will not be able to continue this game.';
    }
}
