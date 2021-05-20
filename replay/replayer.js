class Replayer {
    constructor(piecesJSON, pieces4JSON, pieceImages, gameData) {
        this.w = 8;
        this.h = 16;
        this.grid = new Grid(this.w, this.h);

        this.data = decode(gameData.gameData);
        this.snapshots = this.data.snapshots;
        this.piecesType = this.data.piecesType;
        this.currentSnapshot = 0; //this.snapshots[this.currentSnapshot]
        this.currentMove = 0; //this.snapshots[this.currentSnapshot].moves[this.currentMove]

        this.snapshotTime = 0; //The total time since the last recorded move was made
        this.totalTime = 0; //This actual total time. When this time advances, it will advance snapshotTime accordingly
        this.maximumTime = gameData.time;
        this.timeSpeed = 1;

        this.maxTime = 0; //How long the replay takes
        for (const snap of this.snapshots) {
            for (const move of snap.moves) {
                this.maxTime += move.correctedDeltaTime;
            }
        }

        this.tritrisAmt = 0; //For statistics

        this.alive = true;

        this.startLevel = this.data.startLevel;
        this.level = this.startLevel;
        this.lines = 0;
        this.score = 0;
        this.scoreWeights = { 1: 100, 2: 400, 3: 1200 };

        this.pieceImages = pieceImages;
        this.colors = [
            color(255, 0, 0), //Red boomerang
            color(0, 255, 0), //Green fortune cookie
            color(255, 255, 0), //Yellow pencil
            color(255, 0, 255), //Pink boomerang
            color(0, 255, 255), //Blue pencil
            color(250, 100, 25), //Orange Razor
            color(255), //White Ninja
        ];
        this.piecesJSON = piecesJSON.pieces;
        if (this.piecesType == 4) this.piecesJSON = pieces4JSON.pieces;

        const frameRate = 60.0988; //frames per second
        const msPerFrame = 1000 / frameRate;
        this.entryDelays = [
            10 * msPerFrame,
            12 * msPerFrame,
            14 * msPerFrame, //Numbers from https://tetris.wiki/Tetris_(NES,_Nintendo)
            16 * msPerFrame,
            18 * msPerFrame,
        ];

        this.currentPiece = null;
        this.nextPiece = new Piece(this.piecesJSON[this.data.firstPieceIndex]);
        this.spawnPiece(); //Make next piece current, and pick new next
        this.nextSingles = 0;
        if (this.data.firstPieceIndex == 0) this.nextSingles = 1; //Make sure this gets set correctly

        this.lastFrame = Date.now(); //Used to calculate deltaTime and for DAS

        this.entryDelay = msPerFrame * 14; //There is a 10 frame entry delay (the time btwn the last piece locking in, and the next spawning)
        this.spawnNextPiece = 0;

        this.animationTime = 0;
        this.animatingLines = [];
        this.maxAnimationTime = 20 * msPerFrame;
        this.lastColCleared = 0;
        this.maxFlashTime = 20 * msPerFrame;
        this.flashTime = 0;
        this.flashAmount = 4;

        this.redraw = true;

        this.playClearSound = false;
        this.playFallSound = false;
        this.playMoveSound = false;
        this.playTritrisSound = false;
        this.playLevelupSound = false;
        this.playTopoutSound = false;
    }

    update() {
        const now = Date.now();
        const deltaTime = now - this.lastFrame;
        this.totalTime += deltaTime * this.timeSpeed;

        if (this.timeSpeed < 0) { //Going backwards in time
            this.gotoTime(this.totalTime);
        }

        this._update();
    }

    _update() { //Does the actual update movement. This is necessary to prevent infinite recursion when going backwards in time
        //This loop will move as many pieces as necessary to ensure the replay is caught up with the current time
        let hasMove = true; //Enter the loop at least once (I don't want to write a do-while loop...)
        while (hasMove) {
            hasMove = false;
            if (this.currentSnapshot < this.snapshots.length && this.currentMove < this.snapshots[this.currentSnapshot].moves.length) {
                let currentMove = this.snapshots[this.currentSnapshot].moves[this.currentMove];
                if (this.snapshotTime + currentMove.correctedDeltaTime < this.totalTime) {
                    hasMove = true;
                }
            }

            if (!this.alive) return;

            //Play a line clear animation
            if (this.totalTime <= this.animationTime) {
                this.playLineClearAnimation();
            } else if (this.animatingLines.length > 0) {
                this.updateScoreAndLevel();
            }

            //Spawn the next piece after entry delay
            if (this.currentPiece == null && this.totalTime > this.spawnNextPiece && this.totalTime > this.animationTime) {
                this.spawnPiece();
                this.redraw = true;
                if (!this.isValid(this.currentPiece)) {
                    this.alive = false; //If the new piece is already blocked, game over
                    this.playTopoutSound = true;
                }
            }

            if (this.currentPiece !== null) {
                let movePiece = hasMove;
                if (this.currentSnapshot < this.snapshots.length && this.snapshots[this.currentSnapshot].moves.length == 0) {
                    movePiece = true; //Also move if there are no more moves for this piece
                    game.alive = false; //If the piece didn't move, the game is over
                }
                if (movePiece) {
                    this.moveCurrentPiece();
                }
            }
        }
        this.lastFrame = Date.now();
    }

    playLineClearAnimation() { //Clears triangles one by one
        const now = this.totalTime;
        const percentDone = (this.animationTime - now) / this.maxAnimationTime;
        const clearingCol = Math.floor(percentDone * 10);
        for (const row of this.animatingLines) {
            //Clear as many cols as necessary
            for (let col = this.lastColCleared; col >= clearingCol; col--) {
                //Clear from middle to left (triangle by triangle)
                const colPos = Math.floor(col / 2);
                if (col % 2 == 1) this.grid.removeRightTri(row, colPos);
                else this.grid.removeLeftTri(row, colPos);

                //Clear from middle to right
                const otherColPos = this.w - 1 - colPos;
                if (col % 2 == 0)
                    this.grid.removeRightTri(row, otherColPos);
                else this.grid.removeLeftTri(row, otherColPos);
            }
        }
        this.lastColCleared = clearingCol; //To ensure lag doesn't cause any to get skipped
        this.redraw = true;
    }

    updateScoreAndLevel() { //After line clear, updates score and level
        //After a line clear animation has just been completed
        //Readjust the entry delay to accommodate for the animation time
        this.spawnNextPiece += this.maxAnimationTime;
        this.lines += this.animatingLines.length;

        //Increase the level after a certain amt of lines, then every 10 lines
        let incLevel = false;
        if (this.level == this.startLevel) {
            //This formula is from https://tetris.wiki/Tetris_(NES,_Nintendo)
            if (this.lines >= (this.startLevel + 1) * 10 || this.lines >= max(100, this.startLevel * 10 - 50)) {
                incLevel = true;
            }
        } else {
            //If the tens digit increases (Ex from 128 to 131)
            const prevLineAmt = Math.floor((this.lines - this.animatingLines.length) / 10);
            const newLineAmt = Math.floor(this.lines / 10);
            if (newLineAmt > prevLineAmt) incLevel = true;
        }

        if (incLevel) {
            this.level++;
            this.playLevelupSound = true;
        }
        this.score += this.scoreWeights[this.animatingLines.length] * (this.level + 1);
        if (this.animatingLines.length == 3)
            this.tritrisAmt++;

        for (const row of this.animatingLines) {
            this.grid.removeLine(row);
        }
        this.animatingLines = [];

        this.redraw = true;
    }

    moveCurrentPiece() {
        if (this.snapshots[this.currentSnapshot].moves.length > 0) { //If this piece moves
            let currentMove = this.snapshots[this.currentSnapshot].moves[this.currentMove];
            //Do the next move
            let down = (currentMove.moveDown) ? 1 : 0;
            this.currentPiece.move(currentMove.horzDir, down);
            if (currentMove.rot == -1) this.currentPiece.rotateLeft();
            if (currentMove.rot == 1) this.currentPiece.rotateRight();
            if (currentMove.rot == 2) this.currentPiece.rotate180();

            if (currentMove.horzDir !== 0 || currentMove.rot !== 0)
                this.playMoveSound = true;

            this.snapshotTime += currentMove.correctedDeltaTime;
            this.currentMove++;
        }

        this.redraw = true; //A piece has moved, so the game must be redrawn

        if (this.currentMove >= this.snapshots[this.currentSnapshot].moves.length) { //If those are all the moves for that piece
            //Place the piece
            this.score += this.snapshots[this.currentSnapshot].pushDownPoints;

            //Place the piece
            this.placePiece();

            this.currentSnapshot++;
            this.currentMove = 0; //Move to the next piece

            if (this.currentSnapshot >= this.snapshots.length) {
                //All of the game has been played out!
                this.alive = false;
            }
        }
    }

    placePiece() {
        this.grid.addPiece(this.currentPiece);
        const row = this.currentPiece.getBottomRow();

        this.clearLines(); //Clear any complete lines

        const entryDelay = this.calcEntryDelay(row);
        this.spawnNextPiece = this.snapshotTime + entryDelay;

        this.currentPiece = null; //There is an entry delay for the next piece
    }

    spawnPiece() {
        this.currentPiece = this.nextPiece; //Assign the new current piece

        const nextPieceIndex = this.snapshots[this.currentSnapshot].nextPiece;
        if (this.nextSingles > 0) {
            this.nextSingles--; //Used to display the correct number of singles in the next box
        } else {
            //Next piece is new
            if (nextPieceIndex == 0) { //If next is single, display counter
                this.nextSingles = 2;
            }
        }
        this.nextPiece = new Piece(this.piecesJSON[nextPieceIndex]);

        this.playFallSound = true;
    }

    clearLines() {
        let linesCleared = this.snapshots[this.currentSnapshot].linesCleared;
        if (linesCleared.length > 0) {
            //Set the time for when to stop animating
            this.animationTime = this.snapshotTime + this.maxAnimationTime;
            this.lastColCleared = 0; //Used to ensure all triangles are removed. Starts at 0 to only remove 1 on the first frame
            this.animatingLines = linesCleared; //Which lines are being animated (and cleared)
            if (linesCleared.length == 3) {
                //Tritris!
                this.flashTime = this.snapshotTime + this.maxFlashTime;
                this.playTritrisSound = true;
            } else {
                this.playClearSound = true;
            }
        }
    }

    calcEntryDelay(y) {
        if (y >= 18) return this.entryDelays[0];
        if (y >= 14) return this.entryDelays[1];
        if (y >= 10) return this.entryDelays[2];
        if (y >= 6) return this.entryDelays[3];
        return this.entryDelays[4];
    }

    isValid(piece) {
        if (piece.outOfBounds(this.w, this.h)) return false;
        return this.grid.isValid(piece);
    }

    playSounds(sounds) {
        if (this.playClearSound) {
            sounds.clear.play();
            this.playClearSound = false;
        }
        if (this.playFallSound) {
            sounds.fall.play();
            this.playFallSound = false;
        }
        if (this.playMoveSound) {
            sounds.move.play();
            this.playMoveSound = false;
        }
        if (this.playTritrisSound) {
            sounds.tritris.play();
            this.playTritrisSound = false;
        }
        if (this.playLevelupSound) {
            setTimeout(() => { //Play it after the line clear or tritris sounds are done
                sounds.levelup.play();
            }, 100);
            this.playLevelupSound = false;
        }
        if (this.playTopoutSound) {
            sounds.topout.play();
            this.playTopoutSound = false;
        }
    }

    gotoTime(t) { //Go to time t (ms)
        const goingForward = t > this.totalTime;

        this.totalTime = t;
        this.redraw = true;

        if (goingForward) {
            return; //It will automatically jump forward, no resettings necessary
        }

        //Otherwise, go back to the beginning and replay the entire game up to that point
        this.grid = new Grid(this.w, this.h); //Reset everything
        this.currentSnapshot = 0;
        this.currentMove = 0;

        this.snapshotTime = 0; //The total time since the last recorded move was made
        this.tritrisAmt = 0;
        this.alive = true;
        this.level = this.startLevel;
        this.lines = 0;
        this.score = 0;

        this.currentPiece = null;
        this.nextPiece = new Piece(this.piecesJSON[this.data.firstPieceIndex]);
        this.spawnPiece(); //Make next piece current, and pick new next
        this.nextSingles = 0;
        if (this.data.firstPieceIndex == 0) this.nextSingles = 1; //Make sure this gets set correctly

        this.lastFrame = Date.now(); //Used to calculate deltaTime and for DAS

        this.animationTime = 0;
        this.animatingLines = [];
        this.lastColCleared = 0;
        this.flashTime = 0;

        this._update(); //Get everything up to date

        this.playClearSound = false;
        this.playFallSound = false;
        this.playMoveSound = false;
        this.playTritrisSound = false;
        this.playLevelupSound = false;
        this.playTopoutSound = false;
    }

    show(x, y, w, h, oldGraphics, showGridLines, showStats, showFlash) {
        //Play flashing animation
        const flashing = this.flashTime >= this.totalTime && this.totalTime > 0;
        if (!this.redraw && !flashing) return; //If not flashing, only draw when necessary

        if (flashing && showFlash) {
            const timePassed = this.flashTime - this.totalTime;
            const interval = Math.floor(this.flashAmount * timePassed / this.maxFlashTime);
            if (interval % 2 == 0) {
                background(150);
            } else {
                background(100);
            }
            this.redraw = true; //If flashing, redraw each frame
        } else {
            background(100);
        }


        noStroke();
        fill(0);
        rect(x, y, w, h);

        const cellW = w / this.w;
        const cellH = h / this.h;

        this.grid.show(x, y, w, h, this.colors, this.pieceImages, false, showGridLines, oldGraphics);
        if (this.currentPiece) {
            this.currentPiece.show(x, y, cellW, cellH, this.colors, this.pieceImages, oldGraphics);
        }


        const txtSize = 20;
        textSize(txtSize);
        textAlign(LEFT, TOP);
        const padding = 10;
        const scorePos = createVector(x + w + cellW, y + cellH);
        let scoreDim;

        let normal = this.score % 100000;
        let dig = Math.floor(this.score / 100000);
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

        const scoreTxt = `Score ${formattedScore}`;
        const linesTxt = `Lines  ${this.lines}`;
        const levelTxt = `Level  ${this.level}`;
        const textW = max(
            textWidth(scoreTxt),
            textWidth(linesTxt),
            textWidth(levelTxt),
            4 * cellW
        );
        scoreDim = createVector(
            textW + padding + 10,
            txtSize * 4.5 + padding * 2
        );
        noFill();
        stroke(0);
        strokeWeight(3);
        //The box outline
        rect(scorePos.x, scorePos.y, scoreDim.x, scoreDim.y);
        noStroke();
        fill(0);
        text(scoreTxt, scorePos.x + padding, scorePos.y + padding);
        text(
            linesTxt,
            scorePos.x + padding,
            scorePos.y + padding + 1.75 * txtSize
        );
        text(
            levelTxt,
            scorePos.x + padding,
            scorePos.y + padding + 3.5 * txtSize
        );

        const nextPiecePos = createVector(
            scorePos.x,
            scorePos.y + scoreDim.y + cellH
        );
        const nextPieceDim = createVector(cellW * 3, cellW * 3);
        noFill();
        stroke(0);
        strokeWeight(3);
        rect(nextPiecePos.x, nextPiecePos.y, nextPieceDim.x, nextPieceDim.y);
        if (this.nextPiece) {
            if (this.nextSingles == 0) { //Show next piece normally
                this.nextPiece.showAt(
                    nextPiecePos.x,
                    nextPiecePos.y,
                    nextPieceDim.x,
                    nextPieceDim.y,
                    this.colors,
                    this.pieceImages,
                    oldGraphics
                );
            } else if (this.nextSingles == 2) { //Show 3 Ninjas coming up
                const spacingX = nextPieceDim.x / 7;
                const spacingY = nextPieceDim.y / 7;
                this.nextPiece.showAt(nextPiecePos.x - spacingX, nextPiecePos.y - spacingY, nextPieceDim.x, nextPieceDim.y, this.colors, this.pieceImages, oldGraphics);
                this.nextPiece.showAt(nextPiecePos.x, nextPiecePos.y, nextPieceDim.x, nextPieceDim.y, this.colors, this.pieceImages, oldGraphics);
                this.nextPiece.showAt(nextPiecePos.x + spacingX, nextPiecePos.y + spacingY, nextPieceDim.x, nextPieceDim.y, this.colors, this.pieceImages, oldGraphics);
            } else if (this.nextSingles == 1) { //Show 2 ninjas coming up
                const spacingX = nextPieceDim.x / 7;
                const spacingY = nextPieceDim.y / 7;
                this.nextPiece.showAt(nextPiecePos.x - spacingX/2, nextPiecePos.y - spacingY/2, nextPieceDim.x, nextPieceDim.y, this.colors, this.pieceImages, oldGraphics);
                this.nextPiece.showAt(nextPiecePos.x + spacingX/2, nextPiecePos.y + spacingY/2, nextPieceDim.x, nextPieceDim.y, this.colors, this.pieceImages, oldGraphics);
            }
        }

        if (showStats) {
            const statPos = createVector(
                scorePos.x,
                nextPiecePos.y + nextPieceDim.y + cellH
            );

            let tritrisPercent = Math.round(100 * 3*this.tritrisAmt / this.lines);
            if (this.lines == 0) tritrisPercent = '--';
            const tritrisPercentText = `Tri ${tritrisPercent}%`;

            const cappedTime = Math.min(this.totalTime, this.maximumTime);
            const totalSec = Math.floor(cappedTime / 1000) % 60;
            const totalM = Math.floor(cappedTime / (1000*60));
            const startLevelText = `Time ${nf(totalM,2)}:${nf(totalSec,2)}`;

            const textW = max(
                textWidth(tritrisPercentText),
                textWidth(startLevelText),
                4 * cellW
            );

            const statDim = createVector(
                textW + padding + 10,
                txtSize * 2.75 + padding * 2
            );
            noFill();
            stroke(0);
            strokeWeight(3);
            //The box outline
            rect(statPos.x, statPos.y, statDim.x, statDim.y);
            noStroke();
            fill(0);
            text(tritrisPercentText, statPos.x + padding, statPos.y + padding);
            text(
                startLevelText,
                statPos.x + padding,
                statPos.y + padding + 1.75 * txtSize
            );
        }

        stroke(255,0,0);
        strokeWeight(4);
        noFill();
        rect(x, y, w, h); //Show an outline to indicate this is a replay

        if (!flashing) this.redraw = false;
    }
}

class ReplaySnapshot { //All the data for the movements of 1 piece
    constructor() {
        this.nextPiece = 0;
        this.moves = [];
        this.pushDownPoints = 0;
        this.linesCleared = [];
    }

    setPushDown(points) {
        this.pushDownPoints = points;
    }

    setNext(index) {
        this.nextPiece = index;
    }

    setLines(lines) {
        this.linesCleared = lines;
    }

    addMove(move) {
        this.moves.push(move);
    }

    toString() {
        let str = this.nextPiece.toString();
        for (let move of this.moves) {
            str += move.toString();
        }
        str += '~' + bigIntToBase64(this.pushDownPoints);
        str += this.linesCleared.toString();

        return str;
    }
}

class ReplayMoveAction {
    constructor(encodedDirections, deltaTime) {
        this.correctedDeltaTime = deltaTime * 2; //When encoded, deltaTime was halved and floored to minimize file size

        const firstBit = (encodedDirections >> 0) & 1;
        const secondBit = (encodedDirections >> 1) & 1;
        const thirdBit = (encodedDirections >> 2) & 1;
        const fourthAndFifth = (encodedDirections >> 3) & 11;

        this.moveDown = false;
        if (firstBit) this.moveDown = true;

        this.horzDir = 0;
        if (secondBit) this.horzDir = 1; //Move right
        else if (thirdBit) this.horzDir = -1; //Move left

        this.rot = 0;
        if (fourthAndFifth == 0b10) this.rot = -1; //Counterclock
        else if (fourthAndFifth == 0b01) this.rot = 1; //Clockwise
        else if (fourthAndFifth == 0b11) this.rot = 2; //180
    }
}

function decode(gameData) {
    const version = gameData[0];
    if (version < 0 || version > 1) {
        alert('Unknown save version detected!');
        return;
    }
    let cur = 1;

    let piecesType = 3;
    if (version == 1) {
        const piecesTypeData = decodeBigInt(gameData, cur);
        piecesType = piecesTypeData.number;
        cur = piecesTypeData.cur;
    }
    const startLevelData = decodeBigInt(gameData, cur);
    const startLevel = startLevelData.number;
    cur = startLevelData.cur;

    const firstPieceIndexData = decodeBigInt(gameData, cur);
    const firstPieceIndex = firstPieceIndexData.number;
    cur = firstPieceIndexData.cur;

    let snapshots = [];
    while (cur < gameData.length) {
        //Read a snapshot
        const snapshotData = decodeSnapshot(gameData, cur);
        snapshots.push(snapshotData.snapshot);
        cur = snapshotData.cur; //Continue reading after that snapshot was decoded
    }

    return {
        startLevel,
        piecesType,
        firstPieceIndex,
        snapshots
    }
}

function decodeSnapshot(str, cur) {
    const snapshot = new ReplaySnapshot();

    const nextPieceIndexData = decodeBigInt(str, cur);
    const nextPieceIndex = nextPieceIndexData.number;
    snapshot.setNext(nextPieceIndex);
    cur = nextPieceIndexData.cur;

    while (str[cur] != '~') { //Read all moves until the '~' marks the end of the moves segment
        const moveData = decodeMove(str, cur);
        snapshot.addMove(moveData.move);
        cur = moveData.cur;
    }
    cur++; //Read after the '~'

    const numPointsData = decodeBigInt(str, cur);
    const pushDownPoints = numPointsData.number;
    snapshot.setPushDown(pushDownPoints);
    cur = numPointsData.cur;

    let numLines = 0;
    let lines = [];
    if (cur < str.length) {
        const lineIndicator = str[cur];
        if (lineIndicator == '!') numLines = 1;
        else if (lineIndicator == '@') numLines = 2;
        else if (lineIndicator == '#') numLines = 3;

        if (numLines > 0) cur++; //It read a char indicating how many lines
    }
    for (let i = 0; i < numLines; i++) {
        const lineData = decodeBigInt(str, cur);
        lines.push(lineData.number);

        cur = lineData.cur;
    }
    if (numLines > 0) {
        snapshot.setLines(lines);
    }

    return {
        snapshot,
        cur
    }
}

function decodeMove(str, cur) {
    const encodedDirections = decodeBase64Digit(str[cur]);
    cur++;
    const deltaTimeData = decodeBigInt(str, cur);
    const deltaTime = deltaTimeData.number;
    cur = deltaTimeData.cur;

    const moveAction = new ReplayMoveAction(encodedDirections, deltaTime);

    return {
        cur: cur,
        move: moveAction
    }
}

function decodeBigInt(str, cur) {
    const lens = ['!', '@', '#', '$', '%', '^', '&'];
    const base64Digit = decodeBase64Digit(str[cur]);
    if (base64Digit !== -1) { //It is a base64 digit
        return {
            cur: cur+1,
            number: base64Digit //It was of length 1
        }
    }

    //It has multiple chars
    for (let i = 0; i < lens.length; i++) {
        if (str[cur] == lens[i]) {
            const numDigits = i + 2;
            return {
                cur: cur+numDigits+1,
                number: decodeBase64(str, cur+1, numDigits)
            }
        }
    }

    //It begins with a *
    console.log('A VERY large number was found at pos ' + cur);
    const numDigits = decodeBase64Digit(str[cur+1]); //This is untested because I don't think it's even possible for numbers to get this big...
    return {
        cur: cur+numDigits+1,
        number: decodeBase64(str, cur+2, numDigits)
    }
}

function decodeBase64(str, start, len) {
    let num = 0;
    for (let i = start; i < start+len; i++) {
        num *= 64;
        num += decodeBase64Digit(str[i]);
    }
    return num;
}

function decodeBase64Digit(chr) {
    let charCode = chr.charCodeAt(0);
    if (charCode >= '0'.charCodeAt(0) && charCode <= '9'.charCodeAt(0)) { //Digits 0-9
        return charCode - '0'.charCodeAt(0);
    } else if (charCode >= 'A'.charCodeAt(0) && charCode <= 'Z'.charCodeAt(0)) { //Uppercase A-Z
        return charCode - 'A'.charCodeAt(0) + 10;
    } else if (charCode >= 'a'.charCodeAt(0) && charCode <= 'z'.charCodeAt(0)) { //Lowercase a-z
        return charCode - 'a'.charCodeAt(0) + 36;
    } else if (charCode == '+'.charCodeAt(0)) { // +
        return 62;
    } else if (charCode == '='.charCodeAt(0)) { // -
        return 63;
    }
    return -1; //NOT A BASE 64 DIGIT!
}
