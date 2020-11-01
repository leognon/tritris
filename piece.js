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
        this.pos = createVector(Math.ceil((10 - this.grid.length) / 2), 0);
    }

    move(x, y) {
        this.pos.x += x;
        this.pos.y += y;
    }

    outOfBounds(w, h) {
        return (
            this.pos.x < 0 ||
            this.pos.x + this.grid[0].length > w ||
            this.pos.y < 0 ||
            this.pos.y + this.grid.length > h
        );
    }

    getBottomRow() {
        return this.pos.y + this.grid.length;
    }

    show(originX, originY, cellW, cellH, colors) {
        originX += this.pos.x * cellW;
        originY += this.pos.y * cellH;
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
