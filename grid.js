class Grid {
    constructor(width, height, piecesJSON) {
        this.w = width;
        this.h = height;
        this.grid = [];
        for (let i = 0; i < this.h; i++) {
            this.grid.push([]);
            for (let j = 0; j < this.w; j++) {
                this.grid[i].push(new GridCell());
            }
        }
        

        this.grid[15][4].tris[0][0] = new Triangle(color(255, 0, 0));
        this.grid[10][2].tris[0][0] = new Triangle(color(255, 0, 0));
        this.grid[19][0].tris[0][0] = new Triangle(color(255, 0, 0));
        this.grid[19][0].tris[0][1] = new Triangle(color(0, 255, 0));
    }

    show(x, y, w, h) {
        const cellW = w / this.w;
        const cellH = h / this.h;

        //Draws the triangles in the grid
        stroke(0);
        strokeWeight(1);
        for (let i = 0; i < this.h; i++) {
            for (let j = 0; j < this.w; j++) {
                this.grid[i][j].show(
                    x + j * cellW,
                    y + i * cellH,
                    cellW,
                    cellH
                );
            }
        }

        //Draws the gird outline
        stroke(0);
        strokeWeight(3);
        //Vertical lines
        for (let i = 0; i <= this.w; i++)
            line(x + i * cellW, y, x + i * cellW, y + h);
        //Horizontal lines
        for (let j = 0; j <= this.h; j++)
            line(x, y + j * cellH, x + w, y + j * cellH);
    }
}

class GridCell {
    constructor() {
        this.tris = [
            [null, null],
            [null, null],
        ];
    }

    show(x, y, w, h) {
        for (let row = 0; row < this.tris.length; row++) {
            for (let col = 0; col < this.tris[0].length; col++) {
                if (this.tris[row][col])
                    this.tris[row][col].show(x, y, w, h, row, col);
            }
        }
    }
}

class Triangle {
    constructor(clr) {
        this.clr = clr;
    }

    show(x, y, w, h, row, col) {
        fill(this.clr);
        if (row == 0 && col == 0) {
            triangle(x, y, x, y + h, x + w, y + h);
        } else if (row == 0 && col == 1) {
            triangle(x, y, x + w, y, x + w, y + h);
        } else if (row == 1 && col == 0) {
            triangle(x, y, x + w, y, x, y + h);
        } else if (row == 1 && col == 1) {
            triangle(x, y + h, x + w, y, x + w, y + h);
        }
    }
}
