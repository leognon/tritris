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
        this.pieceSpeed = 200;
        this.lastMoveDown = Date.now();
    }

    update() {
        if (Date.now() >= this.lastMoveDown + this.pieceSpeed) {
            this.currentPiece.move(0, 1); //Move the current piece down
            let validMove = this.isValid(this.currentPiece);
            if (!validMove) {
                this.currentPiece.move(0, -1); //Move the piece up, place on board
                this.grid.addPiece(this.currentPiece);
                this.currentPiece = new Piece(this.piecesJSON[floor(random(this.piecesJSON.length))]);
            }
            this.lastMoveDown = Date.now();
        }
    }

    isValid(piece) {
        if (piece.outOfBounds(this.w, this.h)) return false;
        return this.grid.isValid(piece);
    }

    show(x, y, w, h) {
        this.grid.show(x, y, w, h, this.colors);
        this.currentPiece.show(x, y, w / this.w, h / this.h, this.colors);
    }
}
