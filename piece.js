class Piece {
    constructor(json) {
        this.grid = [];
        const pieces = json.pieces;
        const clr = json.color;
        for (let row = 0; row < pieces.length; row++) {
            this.grid.push([]);
            for (let col = 0; col < pieces[0].length; col++) {
                this.grid[row].push(new GridCell(pieces[row][col], clr));
            }
        }
        this.pos = createVector(Math.ceil((10 - this.grid.length)/2), 0);
    }

    show(originX, originY, cellW, cellH, colors) {
        originX += this.pos.x*cellW;
        originY += this.pos.y*cellH;
        for (let row = 0; row < this.grid.length; row++) {
            for (let col = 0; col < this.grid[0].length; col++) {
                this.grid[row][col].show(
                    originX + col * cellW,
                    originY + row * cellH,
                    cellW,
                    cellH,
                    colors
                );
            }
        }
    }
}
