let game;
let piecesJSON;

function preload() {
    piecesJSON = loadJSON('pieces.json');
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    game = new Game(piecesJSON);
}

function draw() {
    background(150);
    game.update();
    game.show(20, 20, 350, 700);
}
