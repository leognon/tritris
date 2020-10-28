class Game {
    constructor(piecesJSON) {
        this.grid = new Grid(10, 20);
        this.colors = [
            color(255, 0, 0),
            color(0, 255, 0),
            color(255, 255, 0),
            color(255, 0, 255),
            color(100, 250, 50),
            color(250, 100, 25)
        ]
        this.pieces = [];
        for (let piece of piecesJSON.pieces)
            this.pieces.push(getPieces(piece));
        this.grid.grid[3, 5]
    }

    show(x, y, w, h) {
        this.grid.show(x, y, w, h, this.colors);
    }
}

function getPieces(json) {
    let piece = [];
    const pieces = json.pieces;
    const color = json.color;
    for (let row = 0; row < pieces.length; row++) {
        piece.push([]);
        for (let col = 0; col < pieces[0].length; col++) {
            piece[row].push(new GridCell(pieces[row][col]), color);
        }
    }
    return piece;
}
