class Game {
    constructor(piecesJSON, level) {
        this.w = 10;
        this.h = 20;
        this.grid = new Grid(this.w, this.h);

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

        this.currentPiece = new Piece(
            this.piecesJSON[floor(random(this.piecesJSON.length))]
        );
        this.nextPiece = new Piece(
            this.piecesJSON[floor(random(this.piecesJSON.length))]
        );

        const speedMultiples = {
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

        this.pieceSpeed = msPerFrame;
        //Multiplies the by the number of frames for each level
        if (level > 29) level = 29;
        if (level < 0) level = 0;
        while (true) {
            if (speedMultiples.hasOwnProperty(level)) {
                this.pieceSpeed *= speedMultiples[level];
                break;
            } //Finds the correct range for the level speed
            level--;
        }
        this.minDownPieceSpeed = msPerFrame * 8;
        this.lastMoveDown = Date.now() + 750;

        this.das = 0;
        this.dasMax = msPerFrame * 16; //It takes 16 frames on an NES to fully charge DAS
        this.dasCharged = msPerFrame * 10; //When charged, DAS reset to 10 frames

        this.lastFrame = Date.now();

        this.entryDelay = msPerFrame * 14; //There is a 10 frame entry delay (the time btwn the last piece locking in, and the next spawning)
        this.spawnNextPiece = 0;

        this.redraw = true;

        this.leftWasPressed = false;
        this.rightWasPressed = false;
        this.zWasPressed = false;
        this.xWasPressed = false;
    }

    update() {
        const now = Date.now();
        const deltaTime = now - this.lastFrame;

        //Spawn the next piece after entry delay
        if (this.currentPiece == null && now > this.spawnNextPiece) {
            this.currentPiece = this.nextPiece;
            this.nextPiece = new Piece(
                this.piecesJSON[floor(random(this.piecesJSON.length))]
            );
            this.lastMoveDown = now;
            this.redraw = true;
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
            const moveDown = Date.now() >= this.lastMoveDown + pieceSpeed;
            if (horzDirection != 0 || rotation != 0 || moveDown) {
                this.redraw = true; //A piece has moved, so the game must be redrawn
                const placePiece = this.movePiece(horzDirection, rotation, moveDown);
                if (placePiece) {
                    //Place the piece
                    this.grid.addPiece(this.currentPiece);
                    const row = this.currentPiece.getBottomRow();
                    this.spawnNextPiece = now + this.calcEntryDelay(row);
                    this.currentPiece = null; //There is an entry delay for the next piece
                } else {
                    //If the piece was able to just move down, reset the timer
                    if (moveDown) this.lastMoveDown = Date.now();
                }
            }
        }

        this.leftWasPressed = keyIsDown(LEFT_ARROW);
        this.rightWasPressed = keyIsDown(RIGHT_ARROW);
        this.zWasPressed = keyIsDown(90); //If Z was pressed
        this.xWasPressed = keyIsDown(88); //If X was pressed
        this.lastFrame = Date.now();
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
        const nextPiecePos = createVector(x + w + cellW, y + cellH);
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
        //this.nextPiece.showAt(x + w + 10, y + 10, 100, 100, this.colors);
        this.grid.show(x, y, w, h, this.colors);

        this.redraw = false;
    }
}
