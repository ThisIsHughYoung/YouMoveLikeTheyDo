
var manifest = [
	{id:"tileset1", src:"assets/sprites/tileset1.png"},
	{id:"tileset2", src:"assets/sprites/tileset2.png"},
	{id:"tileset3", src:"assets/sprites/tileset3.png"},
	{id:"block", src:"assets/sprites/block.png"},
	{id:"mario", src:"assets/sprites/mario.png"},
];

var defaultKeybinds = {
	'left' : KEYCODE_LEFT,
	'right' : KEYCODE_RIGHT,
	'up' : KEYCODE_UP,
	'down' : KEYCODE_DOWN,
	'a' : 88,
	'b' : 90,
	'tick' : 84,
	'pause' : 80
}

function MarioGame() {
	Game.call(this, "Super Mario Bros.", 256, 224, defaultKeybinds);
	this.begin = onLoad;
	this.tick = tick;
	this.mario = null;
	this.resizeFrame(2);
	this.world = null;
	
	this.assets.tileset1 = null;
	this.assets.tileset2 = null;
	this.assets.tileset3 = null;
}

MarioGame.prototype = Object.create(Game.prototype);
MarioGame.prototype.constructor = MarioGame

var smallMarioAnim = {
	stand: 0,
	walk: [1,2,3],
	skid: 4,
	jump: 5,
	die: 6,
	flag1: 7,
	flag2: 8,
	sink: 9,
	swim: [10, 13, 'sink']
};

var marioDefaults = {
	minSpeed: 0x00130,
	walkAccel: 0x00098,
	runAccel: 0x000E4,
	releaseDecel: 0x000D0,
	skidDecel: 0x001A0,
	walkMaxSpeed: 0x018FF,
	runMaxSpeed: 0x028FF,
	skidTurnSpeed: 0x00AFF,
}


function getTileAtPixel(coords) {
	return [Math.floor(coords[0]/16),Math.floor(coords[1]/16)]
}

function getTileCoords(coords) {
	return [coords[0] * 16, coords[1] * 16];
}

function getLevelTile(chunk, column, block) {
	return [ chunk*2 + column , block];
}

function getLevelCoords(chunk, column, block) {
	var tile = getLevelTile(chunk, column, block)
	return [ tile[0] * 16, tile[1] * 16 ]
}

var game;

function init() {
	game = new MarioGame();
	game.debug = 5;
	game.loadManifest(manifest, true);
}

function onLoad(game) {
	game.assets.tileset1 = new createjs.SpriteSheet({
		images: [game.assets.loader.getResult("tileset1")],
		frames: {width:16, height:16}})
	game.assets.tileset2 = new createjs.SpriteSheet({
		images: [game.assets.loader.getResult("tileset2")],
		frames: {width:16, height:16}})
	game.assets.tileset3 = new createjs.SpriteSheet({
		images: [game.assets.loader.getResult("tileset3")],
		frames: {width:16, height:16}})
		
	begin(game);
}

function begin(game) {
	game.mario = new Mario(game);
	
	game.world = new MarioWorld(game, world[1][1]);
	game.stage.addChild(game.world.container);
	game.world.container.addChild(game.mario.container);
	
	game.stage.update();
	
	createInspectors(game)
}

function getInspectors(game) {
	var hBox = game.mario.getHitbox();
	var rval = [
		{id: "xpos", val:game.mario.x, base:16},
		{id: "ypos", val:game.mario.y, base:16},
		{id: "absspeed", val:((Math.abs(game.mario.speed)&0xFFF00)/0x100), base:16},
		{id: "maxSpeed", val:((Math.abs(game.mario.maxSpeed)&0xFFF00)/0x100), base:16},
		{id: "dir", val:game.mario.dir},
		{id: "skid", val:game.mario.skid},
		{id: "", val:" "},
		{id: "ground", val:game.mario.ground},
		{id: "", val:" "},
		{id: "yspeed", val:game.mario.ySpeed, base:16},
		{id: "MomentumDir", val:game.mario.momentumDir, base:16},
		{id: "Gravity", val:game.mario.gravity, base:16},
		{id: "GravityA", val:game.mario.gravityA, base:16},
		{id: "collision-tl", val:hBox.x, base:16},
		{id: "collision-tr", val:hBox.y, base:16},
		{id: "groundTest", val:game.mario.collision.groundTest},
		{id: "levelEntryFlag", val:game.mario.levelEntryFlag}
	]
	return rval;
}

function createInspectors(game) {
	var inspectors = getInspectors(game)
	for (var i in inspectors) {
		var id = inspectors[i].id;
		var entry = $("<div class='entry'>" + id + ": <span id='" + id + "'> - </span></div>")
		$("#side").append(entry)
	}
}

function updateInspectors(game) {
	var inspectors = getInspectors(game)
	for (var i in inspectors) {
		var id = inspectors[i].id;
		var val = inspectors[i].val;
		var str = val;
		if (typeof(inspectors[i].val) != 'undefined') {
			if ( 'base' in inspectors[i] ) {
				if (inspectors[i].base == 16) {
					str = "0x" + inspectors[i].val.toString(inspectors[i].base);
				}
			}
			$("#" + id).text(str);
		} else {
			$("#" + id).text(" undefined ");
		}
	}
}

function tick(event) {
	if (!event.paused || game.input.isKeyDown['tick']) {
		game.input.tick();
		game.mario.doLogic(game);
		if (game.mario.showHitbox) {
			game.mario.drawHitbox(game);
		}
		game.stage.update();
		game.overlay.stage.update();
		updateInspectors(game)
	}
}