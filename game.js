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
            color(250, 100, 25)
        ]
        this.piecesJSON = piecesJSON.pieces;
        //for (let p of piecesJSON.pieces)
        //    this.pieces.push(new Piece(p));

        this.currentPiece = new Piece(this.piecesJSON[0]);
    }

    show(x, y, w, h) {
        this.grid.show(x, y, w, h, this.colors);
        this.currentPiece.show(x, y, w/this.w, h/this.h, this.colors);
    }
}
