let grid;
let piecesJSON;

function preload() {
    piecesJSON = loadJSON('pieces.json');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  grid = new Grid(10, 20, piecesJSON);
  frameRate(30);
}

function draw() {
  background(150);
  grid.show(20, 20, 350, 700);
}
