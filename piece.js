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
        this.pos = createVector(Math.ceil((8 - this.grid[0].length) / 2), 0);
        this.centerOffset = createVector(
            floor(this.grid[0].length / 2),
            ceil(this.grid.length / 2)
        );
    }

    rotateLeft() {
        let newGrid = [];
        for (let newRow = 0; newRow < this.grid[0].length; newRow++) {
            newGrid.push([]);
            for (let newCol = 0; newCol < this.grid.length; newCol++) {
                const oldRow = newCol;
                const oldCol = this.grid[0].length - 1 - newRow;
                newGrid[newRow].push(this.grid[oldRow][oldCol].rotatedLeft());
            }
        }
        this.grid = newGrid;

        //Calculates a new position so the piece stays centered around the same piece
        this.pos = createVector(
            this.pos.x + this.centerOffset.x - floor(this.grid[0].length / 2),
            this.pos.y + this.centerOffset.y - ceil(this.grid.length / 2)
        );
        this.centerOffset.x = floor(this.grid[0].length / 2);
        this.centerOffset.y = ceil(this.grid.length / 2);
    }

    rotateRight() {
        let newGrid = [];
        for (let newRow = 0; newRow < this.grid[0].length; newRow++) {
            newGrid.push([]);
            for (let newCol = 0; newCol < this.grid.length; newCol++) {
                const oldRow = this.grid.length - 1 - newCol;
                const oldCol = newRow;
                newGrid[newRow].push(this.grid[oldRow][oldCol].rotatedRight());
            }
        }
        this.grid = newGrid;

        //Calculates a new position so the piece stays centered around the same piece
        this.pos = createVector(
            this.pos.x + this.centerOffset.x - floor(this.grid[0].length / 2),
            this.pos.y + this.centerOffset.y - ceil(this.grid.length / 2)
        );
        this.centerOffset.x = floor(this.grid[0].length / 2);
        this.centerOffset.y = ceil(this.grid.length / 2);
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

    showAt(x, y, w, h, colors) {
        const dim = 3;//max(this.grid.length, this.grid[0].length);
        const cellW = w / dim;
        const cellH = h / dim;
        const topLeft = x - this.pos.x*cellW;//The subtraction is to offset from when the show function adds
        const topRight = y - this.pos.y*cellH;
        const centerX = topLeft + cellW*(3-this.grid[0].length)/2;
        const centerY = topRight + cellH*(3-this.grid.length)/2;
        //Centers the piece in the middle of the next box
        this.show(
            centerX,
            centerY,
            w / dim,
            h / dim,
            colors
        );
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
