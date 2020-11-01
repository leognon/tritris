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
            color(100, 250, 50),
            color(250, 100, 25),
        ];
        this.piecesJSON = piecesJSON.pieces;

        this.currentPiece = new Piece(this.piecesJSON[0]);
        this.pieceSpeed = 600;
        this.lastMoveDown = Date.now() + 750;

        const frameRate = 60.0988; //frames per second
        const msPerFrame = 1000 / frameRate;
        this.das = 0;
        this.dasMax = msPerFrame * 16; //It takes 16 frames on an NES to fully charge DAS
        this.dasCharged = msPerFrame * 10; //When charged, DAS reset to 10 frames
        this.lastFrame = Date.now();
        this.keyWasPresssed = false;

        this.entryDelay = msPerFrame * 14; //There is a 10 frame entry delay (the time btwn the last piece locking in, and the next spawning)
        this.spawnNextPiece = 0;
    }

    update() {
        const deltaTime = Date.now() - this.lastFrame;

        if (this.currentPiece == null && Date.now() > this.spawnNextPiece) {
            this.currentPiece = new Piece(this.piecesJSON[floor(random(this.piecesJSON.length))]);
            this.lastMoveDown = Date.now();
        }

        if (this.currentPiece !== null && Date.now() >= this.lastMoveDown + this.pieceSpeed) {
            this.currentPiece.move(0, 1); //Move the current piece down
            let validMove = this.isValid(this.currentPiece);
            if (!validMove) {
                this.currentPiece.move(0, -1); //Move the piece up, place on board
                this.grid.addPiece(this.currentPiece);
                this.currentPiece = null; //There is an entry delay for the next piece
                this.spawnNextPiece = Date.now() + this.entryDelay;
                //TODO Entry delay should vary based on the height the piece was placed at
            }
            this.lastMoveDown = Date.now();
        }

        //If both or neither are pressed, don't move
        let move = false;
        const oneKeyPressed = keyIsDown(LEFT_ARROW) != keyIsDown(RIGHT_ARROW);
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

        this.keyWasPressed = keyIsDown(LEFT_ARROW) || keyIsDown(RIGHT_ARROW);
        this.lastFrame = Date.now();
    }

    isValid(piece) {
        if (piece.outOfBounds(this.w, this.h)) return false;
        return this.grid.isValid(piece);
    }

    show(x, y, w, h) {
        if (this.currentPiece) this.currentPiece.show(x, y, w / this.w, h / this.h, this.colors);
        this.grid.show(x, y, w, h, this.colors);
    }
}
