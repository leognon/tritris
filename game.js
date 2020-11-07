class Game {
    constructor(piecesJSON) {
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
        this.pieceSpeed = msPerFrame * 50;
        this.minDownPieceSpeed = msPerFrame * 8;
        this.lastMoveDown = Date.now() - 750;

        this.das = 0;
        this.dasMax = msPerFrame * 16; //It takes 16 frames on an NES to fully charge DAS
        this.dasCharged = msPerFrame * 10; //When charged, DAS reset to 10 frames
        this.lastFrame = Date.now();
        this.keyWasPresssed = false;
        this.rotateLeftWasPressed = false;
        this.rotateRightWasPressed = false;

        this.entryDelay = msPerFrame * 14; //There is a 10 frame entry delay (the time btwn the last piece locking in, and the next spawning)
        this.spawnNextPiece = 0;
    }

    update() {
        const deltaTime = Date.now() - this.lastFrame;

        //Spawn the next piece after entry delay
        if (this.currentPiece == null && Date.now() > this.spawnNextPiece) {
            this.currentPiece = this.nextPiece;
            this.nextPiece = new Piece(
                this.piecesJSON[floor(random(this.piecesJSON.length))]
            );
            this.lastMoveDown = Date.now();
        }

        //Move the current piece down
        let pieceSpeed = this.pieceSpeed;
        if (keyIsDown(DOWN_ARROW)) {
            pieceSpeed = min(pieceSpeed * 0.5, this.minDownPieceSpeed);
        }
        if (
            this.currentPiece !== null &&
            Date.now() >= this.lastMoveDown + pieceSpeed
        ) {
            this.currentPiece.move(0, 1); //Move the current piece down
            let validMove = this.isValid(this.currentPiece);
            if (!validMove) {
                this.currentPiece.move(0, -1); //Move the piece up, place on board
                this.grid.addPiece(this.currentPiece);
                const row = this.currentPiece.getBottomRow();
                this.spawnNextPiece = Date.now() + this.calcEntryDelay(row);
                this.currentPiece = null; //There is an entry delay for the next piece
            }
            this.lastMoveDown = Date.now();
        }

        //Move left and right
        //If both or neither are pressed, don't move
        let move = false;
        const oneKeyPressed =
            keyIsDown(LEFT_ARROW) != keyIsDown(RIGHT_ARROW) &&
            !keyIsDown(DOWN_ARROW);
        if (oneKeyPressed && this.currentPiece !== null) {
            this.das += deltaTime;
            if (!this.keyWasPressed) {
                //If it was tapped, move and reset das
                move = true;
                this.das = 0;
            } else if (this.das >= this.dasMax) {
                //Key is being held, keep moving
                move = true;
                this.das = this.dasCharged;
            }
        }
        if (move && this.currentPiece !== null) {
            let dir = 0;
            if (keyIsDown(LEFT_ARROW)) dir = -1;
            if (keyIsDown(RIGHT_ARROW)) dir = 1;
            this.currentPiece.move(dir, 0);
            const isValid = this.isValid(this.currentPiece);
            if (!isValid) {
                this.das = this.dasMax;
                this.currentPiece.move(-dir, 0);
            }
        }

        //Rotation
        if (
            this.currentPiece !== null &&
            keyIsDown(90) &&
            !this.rotateLeftWasPressed
        ) {
            this.currentPiece.rotateLeft();
            const valid = this.isValid(this.currentPiece);
            if (!valid) {
                this.currentPiece.rotateRight();
            }
        }
        if (
            this.currentPiece !== null &&
            keyIsDown(88) &&
            !this.rotateRightWasPressed
        ) {
            this.currentPiece.rotateRight();
            const valid = this.isValid(this.currentPiece);
            if (!valid) {
                this.currentPiece.rotateLeft();
            }
        }

        this.keyWasPressed = keyIsDown(LEFT_ARROW) || keyIsDown(RIGHT_ARROW);
        this.rotateLeftWasPressed = keyIsDown(90); //If Z was pressed
        this.rotateRightWasPressed = keyIsDown(88); //If X was pressed
        this.lastFrame = Date.now();
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
        noStroke();
        fill(0);
        rect(x, y, w, h);

        const cellW = w / this.w;
        const cellH = h / this.h;
        if (this.currentPiece) {
            this.currentPiece.show(x, y, cellW, cellH, this.colors);
        }
        const nextPiecePos = createVector(x + w + cellW, y + cellH);
        const nextPieceDim = createVector(cellW * 2.5, cellW * 2.5);
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
    }
}
