class Game {
    constructor(piecesJSON, level) {
        this.w = 8;
        this.h = 16;
        this.grid = new Grid(this.w, this.h);

        this.alive = true;

        if (level < 0) level = 0;
        if (level > 29) level = 29;
        this.startLevel = level;
        this.level = level;
        this.lines = 0;
        this.score = 0;
        this.scoreWeights = { 1: 100, 2: 400, 3: 1200 };

        this.colors = [
            color(255, 0, 0),
            color(0, 255, 0),
            color(255, 255, 0),
            color(255, 0, 255),
            color(0, 255, 255),
            color(250, 100, 25),
            color(255),
        ];
        this.piecesJSON = piecesJSON.pieces;

        const frameRate = 60.0988; //frames per second
        const msPerFrame = 1000 / frameRate;
        this.entryDelays = [
            10 * msPerFrame,
            12 * msPerFrame,
            14 * msPerFrame, //Numbers from https://tetris.wiki/Tetris_(NES,_Nintendo)
            16 * msPerFrame,
            18 * msPerFrame,
        ];

        this.currentPiece = null; //The current piece starts as null
        this.nextPieceIndex = 1 + floor(random(this.piecesJSON.length - 1));
        this.nextPiece = new Piece(this.piecesJSON[this.nextPieceIndex]); //The next piece starts as a random piece that isn't a single triangles
        this.nextSingles = 0;
        this.spawnPiece(); //This will correctly set the currentPiece and correctly pick a new next piece

        this.levelSpeeds = {
            0: 48,
            1: 43, //From https://tetris.wiki/Tetris_(NES,_Nintendo)
            2: 38,
            3: 33,
            4: 28,
            5: 23,
            6: 18,
            7: 13,
            8: 8,
            9: 6,
            10: 5, //Level 10-12
            13: 4, //13 - 15
            16: 3, //16 - 18
            19: 2, //19 - 28
            29: 1, //29+
        };
        for (let lvl of Object.keys(this.levelSpeeds)) {
            this.levelSpeeds[lvl] *= msPerFrame; //Make sure the are in the correct units
        }
        this.pieceSpeed = 0;
        this.setSpeed(); //This will correctly set pieceSpeed depending on which level it's starting on

        this.minDownPieceSpeed = msPerFrame * 8;
        this.lastMoveDown = Date.now() + 750;

        this.das = 0;
        this.dasMax = msPerFrame * 16; //It takes 16 frames on an NES to fully charge DAS
        this.dasCharged = msPerFrame * 10; //When charged, DAS reset to 10 frames

        this.lastFrame = Date.now(); //Used to calculate deltaTime and for DAS

        this.entryDelay = msPerFrame * 14; //There is a 10 frame entry delay (the time btwn the last piece locking in, and the next spawning)
        this.spawnNextPiece = 0;

        this.animationTime = 0;
        this.animatingLines = [];
        this.maxAnimationTime = 20 * msPerFrame;
        this.lastColCleared = 0;

        this.redraw = true;

        this.downPressedAt = 0; //Used to calculate how many cells a piece traveled when down was pressed
        this.downWasPressed = false;
        this.leftWasPressed = false;
        this.rightWasPressed = false;
        this.zWasPressed = false;
        this.xWasPressed = false;
    }

    update() {
        if (!this.alive) return;

        const now = Date.now();
        const deltaTime = now - this.lastFrame;

        //Play a line clear animation
        if (now <= this.animationTime) {
            const percentDone =
                (this.animationTime - now) / this.maxAnimationTime;
            const clearingCol = Math.floor(percentDone * 10);
            for (const row of this.animatingLines) {
                //Clear as many cols as necessary
                for (let col = this.lastColCleared; col >= clearingCol; col--) {
                    //Clear from middle to left (triangle by traingle)
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
        } else if (this.animatingLines.length > 0) {
            //After a line clear animation has just been completed
            //Readjust the entry delay to accomodate for the animation time
            this.spawnNextPiece += this.maxAnimationTime;
            this.score +=
                this.scoreWeights[this.animatingLines.length] *
                (this.level + 1);
            this.lines += this.animatingLines.length;

            //Increase the level after a certain amt of lines, then every 10 lines
            let incLevel = false;
            if (this.level == this.startLevel) {
                //This formula is from https://tetris.wiki/Tetris_(NES,_Nintendo)
                if (
                    this.lines >= (this.startLevel + 1) * 10 ||
                    this.lines >= max(100, this.startLevel * 10 - 50)
                ) {
                    incLevel = true;
                }
            } else {
                //If the tens digit increases (Ex from 128 to 131)
                const prevLineAmt = Math.floor(
                    (this.lines - this.animatingLines.length) / 10
                );
                const newLineAmt = Math.floor(this.lines / 10);
                if (newLineAmt > prevLineAmt) incLevel = true;
            }
            if (incLevel) {
                this.level++;
                this.setSpeed();
            }

            for (const row of this.animatingLines) {
                this.grid.removeLine(row);
            }
            this.animatingLines = [];

            this.redraw = true;
        }

        //Spawn the next piece after entry delay
        if (
            this.currentPiece == null &&
            now > this.spawnNextPiece &&
            now > this.animationTime
        ) {
            this.spawnPiece();
            this.lastMoveDown = now;
            this.redraw = true;
            if (!this.isValid(this.currentPiece)) {
                this.alive = false; //If the new piece is already blocked, game over
            }
        }
        if (this.currentPiece !== null) {
            //If either left is pressed or right is pressed and down isn't
            const oneKeyPressed =
                keyIsDown(LEFT_ARROW) != keyIsDown(RIGHT_ARROW) &&
                !keyIsDown(DOWN_ARROW);
            let move = false;
            if (oneKeyPressed) {
                this.das += deltaTime;
                if (
                    (keyIsDown(LEFT_ARROW) && !this.leftWasPressed) ||
                    (keyIsDown(RIGHT_ARROW) && !this.rightWasPressed)
                ) {
                    //If it was tapped, move and reset das
                    move = true;
                    this.das = 0;
                } else if (this.das >= this.dasMax) {
                    move = true; //Key is being held, keep moving
                    this.das = this.dasCharged;
                }
            }
            let horzDirection = 0;
            if (move) {
                if (keyIsDown(LEFT_ARROW)) horzDirection = -1;
                if (keyIsDown(RIGHT_ARROW)) horzDirection = 1;
            }

            const zPressed = keyIsDown(90) && !this.zWasPressed;
            const xPressed = keyIsDown(88) && !this.xWasPressed;
            const rotation = (zPressed ? -1 : 0) + (xPressed ? 1 : 0);

            let pieceSpeed = this.pieceSpeed;
            if (keyIsDown(DOWN_ARROW)) {
                //Pressing down moves twice as fast, or as fast as the min
                pieceSpeed = min(pieceSpeed * 0.5, this.minDownPieceSpeed);
            }
            if (keyIsDown(DOWN_ARROW) && !this.downWasPressed) {
                this.downPressedAt = this.currentPiece.pos.y; //Save when the piece was first pressed down
            }
            const moveDown = Date.now() >= this.lastMoveDown + pieceSpeed;
            if (horzDirection != 0 || rotation != 0 || moveDown) {
                this.redraw = true; //A piece has moved, so the game must be redrawn
                const placePiece = this.movePiece(
                    horzDirection,
                    rotation,
                    moveDown
                );
                if (placePiece) {
                    if (keyIsDown(DOWN_ARROW)) {
                        //If it was pushed down, give 1 point per grid cell
                        this.score +=
                            this.currentPiece.pos.y - this.downPressedAt;
                        this.downPressedAt = 0;
                    }
                    //Place the piece
                    this.placePiece();
                } else {
                    //If the piece was able to just move down, reset the timer
                    if (moveDown) this.lastMoveDown = Date.now();
                }
            }
        }

        this.downWasPressed = keyIsDown(DOWN_ARROW);
        this.leftWasPressed = keyIsDown(LEFT_ARROW);
        this.rightWasPressed = keyIsDown(RIGHT_ARROW);
        this.zWasPressed = keyIsDown(90); //If Z was pressed
        this.xWasPressed = keyIsDown(88); //If X was pressed
        this.lastFrame = Date.now();
    }

    placePiece() {
        this.grid.addPiece(this.currentPiece);
        const row = this.currentPiece.getBottomRow();

        //Only clear lines if the next piece is not a triangle, or the next piece is a triangle, but it is a new triplet
        if (this.nextPieceIndex != 0 || this.nextSingles == 2) {
            this.clearLines(); //Clear any complete lines
        }

        const entryDelay = this.calcEntryDelay(row);
        this.spawnNextPiece = Date.now() + entryDelay;

        this.currentPiece = null; //There is an entry delay for the next piece
    }

    spawnPiece() {
        this.currentPiece = this.nextPiece;
        this.nextPieceIndex = floor(random(this.piecesJSON.length));
        if (this.nextSingles > 0) {
            this.nextPieceIndex = 0; //This will make it spawn 3 single triangles in a row
            this.nextSingles--;
        } else if (this.nextPieceIndex == 0) {
            //If it randomly chose to spawn 1 triangle, spawn 2 more
            this.nextSingles = 2;
        }
        this.nextPiece = new Piece(this.piecesJSON[this.nextPieceIndex]);
    }

    clearLines() {
        let linesCleared = this.grid.clearLines();
        if (linesCleared.length > 0) {
            //Set the time for when to stop animating
            this.animationTime = Date.now() + this.maxAnimationTime;
            this.lastColCleared = 0; //Used to ensure all triangles are removed. Starts at 0 to only remove 1 on the first frame
            this.animatingLines = linesCleared; //Which lines are being animated (and cleared)
        }
    }

    setSpeed() {
        let lvl = this.level;
        if (this.level > 29) lvl = 29;
        if (this.level < 0) lvl = 0;
        while (true) {
            if (this.levelSpeeds.hasOwnProperty(lvl)) {
                this.pieceSpeed = this.levelSpeeds[lvl];
                break;
            } //Finds the correct range for the level speed
            lvl--;
            if (lvl < 0) {
                //Uh oh, something went wrong
                console.error('Level Speed could not be found!');
                break;
            }
        }
    }

    movePiece(horzDirection, rotation, moveDown) {
        //Apply all transformations
        const vertDirection = moveDown ? 1 : 0;
        this.currentPiece.move(horzDirection, vertDirection);
        if (rotation == -1) this.currentPiece.rotateLeft();
        if (rotation == 1) this.currentPiece.rotateRight();

        //Try with all transformations
        let valid = this.isValid(this.currentPiece);
        if (valid) {
            //The piece (possibly) moved horizontally, rotated and moved down
            return false; //Don't place the piece
        }
        //If blocked, undo horz move and maybe wall-charge
        this.currentPiece.move(-horzDirection, 0);
        valid = this.isValid(this.currentPiece);
        if (valid) {
            //If the piece was block when moving horz, then wall charge
            this.das = this.dasMax;
            return false;
        }

        //If not valid, undo rotation
        if (rotation == 1) this.currentPiece.rotateLeft();
        if (rotation == -1) this.currentPiece.rotateRight();
        valid = this.isValid(this.currentPiece);
        if (valid) {
            //The piece was blocked by rotating
            return false; //Don't place the piece
        }

        //If it reaches here, the piece was blocked by moving down and should be placed
        if (moveDown) this.currentPiece.move(0, -1); //Move the piece back up
        //The extra if statement is incase the pieces are at the top and spawn in other pieces
        return true; //Place the piece
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

    show(x, y, w, h) {
        if (!this.redraw) return;
        background(100);

        noStroke();
        fill(0);
        rect(x, y, w, h);

        const cellW = w / this.w;
        const cellH = h / this.h;
        if (this.currentPiece) {
            this.currentPiece.show(x, y, cellW, cellH, this.colors);
        }

        const txtSize = 20;
        textSize(txtSize);
        textAlign(LEFT, TOP);
        const padding = 10;
        const scorePos = createVector(x + w + cellW, y + cellH);
        const scoreTxt = `Score ${this.score}`;
        const linesTxt = `Lines  ${this.lines}`;
        const levelTxt = `Level  ${this.level}`;
        const textW = max(
            textWidth(scoreTxt),
            textWidth(linesTxt),
            textWidth(levelTxt),
            4 * cellW
        );
        const scoreDim = createVector(
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
        this.nextPiece.showAt(
            nextPiecePos.x,
            nextPiecePos.y,
            nextPieceDim.x,
            nextPieceDim.y,
            this.colors
        );

        this.grid.show(x, y, w, h, this.colors);

        this.redraw = false;
    }
}
