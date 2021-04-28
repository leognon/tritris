class Grid {
    constructor(width, height) {
        this.w = width;
        this.h = height;
        this.grid = [];
        for (let i = 0; i < this.h; i++) {
            this.grid.push([]);
            for (let j = 0; j < this.w; j++) {
                this.grid[i].push(new GridCell());
            }
        }
    }

    clearLines(linePosition) {
        let linesCleared = [];
        //Only checks three lines above and below for performance
        if (linePosition < 3)
            linePosition = 3;
        else if (this.h - linePosition < 3)
            linePosition = this.h - 3;
        for (let row = linePosition - 3; row < linePosition + 3; row++) {
            let full = true;
            for (let col = 0; col < this.w; col++) {
                if (!this.grid[row][col].isFull()) {
                    full = false;
                    break;
                }
            }
            if (full) {
                linesCleared.push(row);
            }
        }
        return linesCleared;
    }

    removeRightTri(row, col) {
        if (col < 0 || col >= this.w) return;
        this.grid[row][col].removeRightTri();
    }

    removeLeftTri(row, col) {
        if (col < 0 || col >= this.w) return;
        this.grid[row][col].removeLeftTri();
    }

    removeLine(row) {
        this.grid.splice(row, 1); //Remove the row
        this.grid.unshift([]); //Add a new row at the top
        for (let col = 0; col < this.w; col++) this.grid[0].push(new GridCell());
    }

    addPiece(piece) {
        for (let row = 0; row < piece.grid.length; row++) {
            for (let col = 0; col < piece.grid[0].length; col++) {
                let gridRow = row + piece.pos.y;
                let gridCol = col + piece.pos.x;
                this.grid[gridRow][gridCol].addCell(piece.grid[row][col]);
            }
        }
    }

    isValid(piece) {
        for (let row = 0; row < piece.grid.length; row++) {
            for (let col = 0; col < piece.grid[0].length; col++) {
                let gridRow = row + piece.pos.y;
                let gridCol = col + piece.pos.x;
                if (
                    this.grid[gridRow][gridCol].collides(piece.grid[row][col])
                ) {
                    return false;
                }
            }
        }
        return true;
    }

    show(x, y, w, h, colors, pieceImages, paused, showGridLines, oldGraphics) {
        const cellW = w / this.w;
        const cellH = h / this.h;

        if (showGridLines) {
            //Draws the grid outline
            stroke(100);
            strokeWeight(2);
            //Vertical lines
            for (let i = 0; i <= this.w; i++)
                line(x + i * cellW, y, x + i * cellW, y + h);
            //Horizontal lines
            for (let j = 0; j <= this.h; j++)
                line(x, y + j * cellH, x + w, y + j * cellH);
        }
        if (!paused) {
            //Draws the triangles in the grid
            for (let i = 0; i < this.h; i++) {
                for (let j = 0; j < this.w; j++) {
                    this.grid[i][j].show(
                        x + j * cellW,
                        y + i * cellH,
                        cellW,
                        cellH,
                        colors,
                        pieceImages,
                        oldGraphics
                    );
                }
            }
        }

        //Draws only the outside borders on top of the pieces, so they don't stick out of the board
        stroke(100);
        strokeWeight(2);
        line(x, y, x, y + h);
        line(x + this.w * cellW, y, x + this.w * cellW, y + h);
        line(x, y, x + w, y);
        line(x, y + this.h * cellH, x + w, y + this.h * cellH);
    }
}

class GridCell {
    constructor(triangles, clr) {
        if (triangles == undefined) {
            this.tris = [
                [null, null],
                [null, null],
            ];
        } else {
            this.tris = [];
            for (let row = 0; row < 2; row++) {
                this.tris.push([]);
                for (let col = 0; col < 2; col++) {
                    if (triangles[row][col] == 1) {
                        this.tris[row][col] = new Triangle(clr);
                    } else {
                        this.tris[row][col] = null;
                    }
                }
            }
        }
    }

    removeRightTri() {
        this.tris[0][1] = null;
        this.tris[1][1] = null;
    }

    removeLeftTri() {
        this.tris[0][0] = null;
        this.tris[1][0] = null;
    }

    isFull() {
        return (this.tris[0][0] !== null && this.tris[1][1] !== null) ||
            (this.tris[1][0] !== null && this.tris[0][1] !== null);
    }

    rotatedLeft() {
        let rotated = new GridCell();
        rotated.tris = [
            [this.tris[0][1], this.tris[1][1]],
            [this.tris[0][0], this.tris[1][0]],
        ];
        return rotated;
    }

    rotatedRight() {
        let rotated = new GridCell();
        rotated.tris = [
            [this.tris[1][0], this.tris[0][0]],
            [this.tris[1][1], this.tris[0][1]],
        ];
        return rotated;
    }

    addCell(cell) {
        for (let row = 0; row < this.tris.length; row++) {
            for (let col = 0; col < this.tris[0].length; col++) {
                if (cell.tris[row][col])
                    this.tris[row][col] = cell.tris[row][col];
            }
        }
    }

    collides(other) {
        for (let row = 0; row < this.tris.length; row++) {
            for (let col = 0; col < this.tris[0].length; col++) {
                if (!this.tris[row][col]) continue;
                if (
                    other.tris[row][col] ||
                    other.tris[(row + 1) % 2][col] ||
                    other.tris[row][(col + 1) % 2]
                )
                    return true; //There is a collision
            }
        }
        return false;
    }

    show(x, y, w, h, colors, pieceImages, oldGraphics) {
        for (let row = 0; row < this.tris.length; row++) {
            for (let col = 0; col < this.tris[0].length; col++) {
                if (this.tris[row][col])
                    this.tris[row][col].show(x, y, w, h, row, col, colors, pieceImages, oldGraphics);
            }
        }
    }
}

class Triangle {
    constructor(clr) {
        this.clr = clr;
    }

    show(x, y, w, h, row, col, colors, pieceImages, oldGraphics) {
        if (oldGraphics) {
            stroke(100);
            strokeWeight(2);
            fill(colors[this.clr]);
            if (row == 0 && col == 0) {
                triangle(x, y, x + w, y, x, y + h);
            } else if (row == 0 && col == 1) {
                triangle(x, y, x + w, y, x + w, y + h);
            } else if (row == 1 && col == 0) {
                triangle(x, y, x, y + h, x + w, y + h);
            } else if (row == 1 && col == 1) {
                triangle(x, y + h, x + w, y, x + w, y + h);
            }
        } else {
            const thisColor = pieceImages[this.clr];
            let rot;
            if (row == 0 && col == 0) { //Top left
                rot = 3;
            } else if (row == 0 && col == 1) { //Top right
                rot = 2;
            } else if (row == 1 && col == 0) { //Bottom left
                rot = 1;
            } else if (row == 1 && col == 1) { //Bottom right
                rot = 0;
            }
            image(thisColor[rot], x, y, w, h);
        }
    }
}
