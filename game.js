class Game {
    constructor(piecesJSON, pieceImages, level, practice) {
        this.w = 8;
        this.h = 16;
        this.grid = new Grid(this.w, this.h);

        this.tritrisAmt = 0; //For statistics
        this.totalTime = 0;

        this.history = [];
        this.currentSnapshot = new Snapshot(this.totalTime);
        this.firstPieceIndex = 0;

        this.alive = true;

        if (level < 0) level = 0;
        if (level > 29) level = 29;
        if (level >= 20 && level <= 28) level = 19; //Can only start on 0-19 or 29
        this.startLevel = level;
        this.level = level;
        this.lines = 0;
        this.score = 0;
        this.scoreWeights = { 1: 100, 2: 400, 3: 1200 };

        this.piecesType = 3; //How many triangles are in each piece
        if (piecesJSON.pieces.length > 7) this.piecesType = 4; //Quadtris

        this.practice = practice;
        if (this.practice) {
            for (const lineAmt in this.scoreWeights) {
                this.scoreWeights[lineAmt] = 0; //No points in practice mode
            }
        }

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
        this.nextPiece = null; //The next piece starts as a random piece that isn't a single triangles
        this.nextPieceIndex = null;
        this.nextSingles = 0;
        this.bag = [];
        this.spawnPiece(); //Sets the next piece
        this.firstPieceIndex = this.nextPieceIndex; //Used for saving games
        this.spawnPiece(); //Make next piece current, and pick new next

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

        this.softDropSpeed = msPerFrame * 2;
        if (this.practice) this.softDropSpeed *= 4;
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
        this.maxFlashTime = 20 * msPerFrame;
        this.flashTime = 0;
        this.flashAmount = 4;

        this.redraw = true;

        this.downPressedAt = 0; //Used to calculate how many cells a piece traveled when down was pressed
        this.downWasPressed = false;
        this.leftWasPressed = false;
        this.rightWasPressed = false;
        this.zWasPressed = false;
        this.zCharged = false;
        this.xWasPressed = false;
        this.xCharged = false;

        this.playClearSound = false;
        this.playFallSound = false;
        this.playMoveSound = false;
        this.playTritrisSound = false;
        this.playLevelupSound = false;
        this.playTopoutSound = false;
    }

    update() {
        if (!this.alive) return;

        const now = Date.now();
        const deltaTime = now - this.lastFrame;
        this.totalTime += deltaTime;

        //Play a line clear animation
        if (now <= this.animationTime) {
            const percentDone = (this.animationTime - now) / this.maxAnimationTime;
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
            //Readjust the entry delay to accommodate for the animation time
            this.spawnNextPiece += this.maxAnimationTime;
            if (!this.practice) { //No lines or score in practice mode
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
                    this.setSpeed();
                }
                this.score += this.scoreWeights[this.animatingLines.length] * (this.level + 1);
                if (this.animatingLines.length == 3)
                    this.tritrisAmt++;
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
                this.updateHistory();
                this.alive = false; //If the new piece is already blocked, game over
                this.playTopoutSound = true;
            }
        }

        if (this.currentPiece !== null) {
            //If either left is pressed or right is pressed and down isn't pressed, unless in practice mode
            let oneKeyPressed = (isPressed(controls.left) != isPressed(controls.right)) && (!isPressed(controls.down) || this.practice);
            
            let move = false;
            if (oneKeyPressed) {
                this.das += deltaTime;
                if (
                    (isPressed(controls.left) && !this.leftWasPressed) ||
                    (isPressed(controls.right) && !this.rightWasPressed)
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
                if (isPressed(controls.left)) horzDirection = -1;
                if (isPressed(controls.right)) horzDirection = 1;
            }

            const zPressed = isPressed(controls.counterClock) && (!this.zWasPressed || this.zCharged);
            const xPressed = isPressed(controls.clock) && (!this.xWasPressed || this.xCharged);
            let rotation = 0;
            if (zPressed && xPressed) rotation = 2;
            else if (xPressed) rotation = 1;
            else if (zPressed) rotation = -1;

            let pieceSpeed = this.pieceSpeed;
            if (isPressed(controls.down)) {
                //Pressing down moves twice as fast, or as fast as the min
                pieceSpeed = min(pieceSpeed, this.softDropSpeed);
            }
            if (isPressed(controls.down) && !this.downWasPressed) {
                this.downPressedAt = this.currentPiece.pos.y; //Save when the piece was first pressed down
            }
            let moveDown = Date.now() >= this.lastMoveDown + pieceSpeed;
            if (this.practice && !isPressed(controls.down)) {
                moveDown = false; //Pieces only move down when down is pressed in practice mode
            }
            if (horzDirection != 0 || rotation != 0 || moveDown) {
                this.redraw = true; //A piece has moved, so the game must be redrawn
                const placePiece = this.movePiece(
                    horzDirection,
                    rotation,
                    moveDown
                );
                if (placePiece) {
                    let pushDownPoints = 0;
                    if (isPressed(controls.down)) {
                        //If it was pushed down, give 1 point per grid cell
                        if (!this.practice) {
                            pushDownPoints = this.currentPiece.pos.y - this.downPressedAt;
                        }
                        this.score += pushDownPoints;
                    }
                    this.downPressedAt = 0;

                    //Place the piece
                    this.placePiece();

                    this.currentSnapshot.setPushDown(pushDownPoints);
                    this.updateHistory();

                    this.zCharged = false; //After a piece is placed, don't rotate the next piece
                    this.xCharged = false;
                } else {
                    //If the piece was able to just move down, reset the timer
                    if (moveDown) this.lastMoveDown = Date.now();
                }
            }
        }

        this.downWasPressed = isPressed(controls.down);
        this.leftWasPressed = isPressed(controls.left);
        this.rightWasPressed = isPressed(controls.right);
        this.zWasPressed = isPressed(controls.counterClock); //If Z was pressed
        this.xWasPressed = isPressed(controls.clock); //If X was pressed
        if (!isPressed(controls.counterClock)) this.zCharged = false; //If the player is pressing anymore, they no longer want to rotate, so don't charge
        if (!isPressed(controls.clock)) this.xCharged = false;
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
        if (this.bag.length == []) {
            for (let i = 0; i < this.piecesJSON.length; i++) {
                this.bag.push(i); //Refill the bag with each piece
            }
        }
        this.currentPiece = this.nextPiece; //Assign the new current piece
        if (this.nextSingles > 0) {
            this.nextPieceIndex = 0; //This will make it spawn 3 single triangles in a row
            this.nextSingles--;
        } else {
            const bagIndex = Math.floor(random() * this.bag.length);
            this.nextPieceIndex = this.bag.splice(bagIndex, 1)[0]; //Pick 1 item and remove it from bag
            if (this.nextPieceIndex == 0) {
                //If it randomly chose to spawn 1 triangle, spawn 2 more
                this.nextSingles = 2;
            }
        }

        this.currentSnapshot.setNext(this.nextPieceIndex);
        this.nextPiece = new Piece(this.piecesJSON[this.nextPieceIndex]);
        this.playFallSound = true;
    }

    clearLines() {
        let linesCleared = this.grid.clearLines();
        if (linesCleared.length > 0) {
            this.currentSnapshot.setLines(linesCleared);
            //Set the time for when to stop animating
            this.animationTime = Date.now() + this.maxAnimationTime;
            this.lastColCleared = 0; //Used to ensure all triangles are removed. Starts at 0 to only remove 1 on the first frame
            this.animatingLines = linesCleared; //Which lines are being animated (and cleared)
            if (linesCleared.length == 3) {
                //Tritris!
                this.flashTime = Date.now() + this.maxFlashTime;
                this.playTritrisSound = true;
            } else {
                this.playClearSound = true;
            }
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
        else if (rotation == 1) this.currentPiece.rotateRight();
        else if (rotation == 2) this.currentPiece.rotate180();

        //Try with all transformations
        let valid = this.isValid(this.currentPiece);
        if (valid) {
            //The piece (possibly) moved horizontally, rotated and moved down
            if (horzDirection != 0) {
                this.playMoveSound = true;
            }
            if (rotation != 0) {
                this.playMoveSound = true;
                this.zCharged = false;
                this.xCharged = false;
            }

            this.currentSnapshot.addMove(this.totalTime, horzDirection, moveDown, rotation);
            return false; //Don't place the piece
        }
        //If blocked, undo horz move and maybe wall-charge
        this.currentPiece.move(-horzDirection, 0);
        valid = this.isValid(this.currentPiece);
        if (valid) {
            //If the piece was block when moving horz, then wall charge
            this.das = this.dasMax;
            if (rotation != 0) {
                this.playMoveSound = true;
                this.zCharged = false; //If it was able to move, don't keep rotating
                this.xCharged = false;
            }
            this.currentSnapshot.addMove(this.totalTime, 0, moveDown, rotation);
            return false;
        }

        //If not valid, undo rotation
        if (rotation == 1) this.currentPiece.rotateLeft();
        if (rotation == -1) this.currentPiece.rotateRight();
        if (rotation == 2) this.currentPiece.rotate180();
        valid = this.isValid(this.currentPiece);
        if (valid) {
            //The piece was blocked by rotating
            if (rotation == 1) this.xCharged = true;
            if (rotation == -1) this.zCharged = true;
            if (rotation == 2) {
                this.xCharged = true;
                this.zCharged = true;
            }
            if (horzDirection != 0) this.das = this.dasMax; //Also charge das if blocked by a rotation/wall
            this.currentSnapshot.addMove(this.totalTime, 0, moveDown, 0);
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

    show(x, y, w, h, paused, oldGraphics, showGridLines, showStats, showFlash) {
        //Play flashing animation
        const flashing = this.flashTime >= Date.now();
        if (!this.redraw && !flashing) return; //If not flashing, only draw when necessary

        if (flashing && showFlash) {
            const timePassed = this.flashTime - Date.now();
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

        // Appropriately pause and unpause the background music
        if(paused) sounds.background.play(false);
        else if(sounds.background.paused()) sounds.background.play(true);

        noStroke();
        fill(0);
        rect(x, y, w, h);

        const cellW = w / this.w;
        const cellH = h / this.h;

        this.grid.show(x, y, w, h, this.colors, this.pieceImages, paused, showGridLines, oldGraphics);
        if (this.currentPiece && !paused) {
            this.currentPiece.show(x, y, cellW, cellH, this.colors, this.pieceImages, oldGraphics);
        }


        const txtSize = 20;
        textSize(txtSize);
        textAlign(LEFT, TOP);
        const padding = 10;
        const scorePos = createVector(x + w + cellW, y + cellH);
        let scoreDim;

        if (!this.practice) {
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
        } else {
            //Practice mode text
            const line1 = 'PRACTICE';
            const line2 = 'MODE';
            const textW = max(
                textWidth(line1),
                textWidth(line2),
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
            text(line1, scorePos.x + padding, scorePos.y + padding);
            text(
                line2,
                scorePos.x + padding,
                scorePos.y + padding + 1.75 * txtSize
            );
        }

        const nextPiecePos = createVector(
            scorePos.x,
            scorePos.y + scoreDim.y + cellH
        );
        const nextPieceDim = createVector(cellW * 3, cellW * 3);
        noFill();
        stroke(0);
        strokeWeight(3);
        rect(nextPiecePos.x, nextPiecePos.y, nextPieceDim.x, nextPieceDim.y);
        if (!paused && this.nextPiece) {
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

        if (showStats && !this.practice) {
            const statPos = createVector(
                scorePos.x,
                nextPiecePos.y + nextPieceDim.y + cellH
            );

            let tritrisPercent = Math.round(100 * 3*this.tritrisAmt / this.lines);
            if (this.lines == 0) tritrisPercent = '--';
            const tritrisPercentText = `Tri ${tritrisPercent}%`;

            const totalSec = Math.floor(this.totalTime / 1000) % 60;
            const totalM = Math.floor(this.totalTime / (1000*60));
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

        if (this.practice) {
            stroke(255,0,0);
            strokeWeight(4);
            noFill();
            rect(x, y, w, h);
        }

        if (!flashing) this.redraw = false;
    }

    updateHistory() {
        sounds.background.play(false);
        this.history.push(this.currentSnapshot);
        this.currentSnapshot = new Snapshot(this.totalTime);
    }

    toString() {
        /* Encoding Scheme:
         * First char - version (currently 1)
         * Second char - Piece type. 3 for normal pieces, 4 for quadtris. Encoded as bigInt
         * Third char - Start level (encoded as big int)
         * Fourth char - First piece index (encoded as big int)
         * Snapshot: (Repeat for all pieces in the game)
         *     First char - nextPieceIndex (encoded as bigInt)
         *     For all moves:
         *         Next char - Binary encoded movement
         *         Next char - deltaTime (encoded as big int)
         *     Repeat for all movements of that piece
         *     Next char - '~' Signifies piece movement is done
         *     Next char - numPoints (encoded as bigInt)
         *     Next char(s) - Lines cleared
         *         if numLines == 0:
         *              nothing
         *         if numLines == 1:
         *              Prefix with an '!', then which number line was cleared (encoded as bigInt)
         *          if numLines == 2:
         *              Prefix with an '@', then the numbers of the 2 lines that were cleared (encoded as bigInt)
         *          if numLines == 3:
         *              Prefix with '#', then the numbers of the 3 lines that were cleared (encoded as bigInt)
         *
         *
         * Big int encoding:
         * For an integer x, if x < 64:
         *      Encoded as base64 (with digits 0-9, A-Z, a-z +, =)
         * Otherwise, the number is prefixed with the number of chars x takes up (everything in base64)
         *      A symbol indicates how many chars are used.
         *          ! = 2, @ = 3, # = 4, $ = 5, % = 6, ^ = 7, & = 8
         *      If more than 8 chars are needed (which should never happen, and might not be possible):
         *          It is prefixed with *, then base64 of how many chars are used, then the number
         */

        //The first 1 is to indicate version 1, to allow for better compatibility
        const version = '1'; //1st char
        const piecesType = bigIntToBase64(this.piecesType); //2nd char
        const startLevel = bigIntToBase64(this.startLevel); //3rd char
        const firstPiece = bigIntToBase64(this.firstPieceIndex); //4th char
        let str = version + piecesType + startLevel + firstPiece;
        for (let i = 0; i < this.history.length; i++) {
            str += this.history[i].toString();
        }
        if (this.alive) str += this.currentSnapshot.toString();
        return str;
    }
}

class Snapshot { //All the data for the movements of 1 piece
    constructor(spawnTime) {
        this.nextPiece = 0;
        this.moves = [];
        this.lastMoveTime = spawnTime;
        this.pushDownPoints = 0;
        this.linesCleared = new LinesCleared([]);
    }

    setPushDown(points) {
        this.pushDownPoints = points;
    }

    setNext(index) {
        this.nextPiece = index;
    }

    setLines(lines) {
        this.linesCleared = new LinesCleared(lines);
    }

    addMove(totalTime, horzDirection, moveDown, rotation) {
        const deltaTime = totalTime - this.lastMoveTime;
        const moveAction = new MoveAction(deltaTime, horzDirection, moveDown, rotation);
        this.moves.push(moveAction);

        this.lastMoveTime = totalTime;
    }

    toString() {
        let str = bigIntToBase64(this.nextPiece);
        for (let move of this.moves) {
            str += move.toString();
        }
        str += '~' + bigIntToBase64(this.pushDownPoints);
        str += this.linesCleared.toString();

        return str;
    }
}

class MoveAction {
    constructor(deltaTime, horzDir, moveDown, rot) {
        this.correctedTime = Math.floor(deltaTime / 2); //To reduce file size, it looses some precision
        this.horzDir = horzDir;
        this.moveDown = moveDown;
        this.rot = rot;

        let bin = 0; //The binary encoding of the piece
        //From right to left,
        //First bit: 0 - Don't move down, 1 - Move down
        if (this.moveDown) bin += 0b1;
        //Second bit: 0 - Don't move right, 1 - Move right
        if (this.horzDir == 1) bin += 0b10;
        //Third bit: 0 - Don't move left, 1 - Move left
        if (this.horzDir == -1) bin += 0b100;
        //Fourth/Fifth bit:
        //     00 - No rotate
        //     10 - Counterclock rotate
        //     01 - Clockwise rotate
        //     11 - 180 rotate
        if (this.rot == -1)     bin += 0b10000;
        else if (this.rot == 1) bin += 0b01000;
        else if (this.rot == 2) bin += 0b11000;

        this.str = intToBase64(bin) + bigIntToBase64(this.correctedTime);
    }

    toString() {
        return this.str;
    }
}

class LinesCleared {
    constructor(lines) {
        this.lines = lines;

        this.str = '';
        let encoded = '';
        for (let line of this.lines) encoded += bigIntToBase64(line);
        const lens = ['!', '@', '#', '$', '%', '^', '&'];
        if (this.lines.length > 0) {
            this.str = lens[this.lines.length-1] + encoded;
        }
    }

    toString() {
        return this.str;
    }
}

function bigIntToBase64(x) {
    let base64 = intToBase64(x);
    if (base64.length > 1) { //Extra characters used for big numbers
        //The prefix indicating the num of chars in the num
        const lens = ['!', '@', '#', '$', '%', '^', '&'];
        if (base64.length-2 > lens.length) {
            //Number is too big (this is totally overkill, I don't think JS even stores numbers this big)
            //Prefix with *, then another char indicating the len
            base64 = '*' + intToBase64(base64.length) + base64;
        } else {
            //Num only needs a symbolic prefix
            base64 = lens[base64.length-2] + base64;
        }
    }

    return base64;
}

function intToBase64(x) {
    if (x == 0) return '0';

    let ans = '';
    while (x > 0) {
        let nextDigit = x % 64;
        let nextChar;
        if (nextDigit <= 9) {
            nextChar = String.fromCharCode(nextDigit + 48); //Digits 0-9
        } else if (nextDigit <= 35) {
            nextChar = String.fromCharCode(nextDigit - 10 + 65); //Uppercase A-Z
        } else if (nextDigit <= 61) {
            nextChar = String.fromCharCode(nextDigit - 36 + 97); //Lowercase a-z
        } else if (nextDigit == 62) {
            nextChar = '+'; //Out of letters and numbers...
        } if (nextDigit == 63) {
            nextChar = '=';
       }

        ans = nextChar + ans;
        x = Math.floor(x / 64);
    }

    return ans;
}
