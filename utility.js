//These are various function that don't fit elsewhere
const totalAssets = 8;
let loadedAssets = 0;
const countLoaded = () => { loadedAssets++; };

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
        game.playSounds(clearSound, fallSound, moveSound, tritrisSound);

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
        return;
    }
    if (level < 0) {
        console.error('Negative level selected');
        alert('Please select a positive level');
        return;
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
    if (localStorage.hasOwnProperty(key))
        return JSON.parse(localStorage.getItem(key));
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

