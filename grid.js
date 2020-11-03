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

    show(x, y, w, h, colors) {
        const cellW = w / this.w;
        const cellH = h / this.h;

        //Draws the triangles in the grid
        for (let i = 0; i < this.h; i++) {
            for (let j = 0; j < this.w; j++) {
                this.grid[i][j].show(
                    x + j * cellW,
                    y + i * cellH,
                    cellW,
                    cellH,
                    colors
                );
            }
        }

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

    show(x, y, w, h, colors) {
        for (let row = 0; row < this.tris.length; row++) {
            for (let col = 0; col < this.tris[0].length; col++) {
                if (this.tris[row][col])
                    this.tris[row][col].show(x, y, w, h, row, col, colors);
            }
        }
    }
}

class Triangle {
    constructor(clr) {
        this.clr = clr;
    }

    show(x, y, w, h, row, col, colors) {
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
    }
}
