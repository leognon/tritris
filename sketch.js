let game;
let piecesJSON;

function preload() {
    piecesJSON = loadJSON('pieces4.json');
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    game = new Game(piecesJSON);
}

function draw() {
    background(100);
    game.update();
    game.show(20, 20, 350, 700);
}
