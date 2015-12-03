
var manifest = [
	{id:"tileset1", src:"assets/sprites/tileset1.png"},
	{id:"tileset2", src:"assets/sprites/tileset2.png"},
	{id:"tileset3", src:"assets/sprites/tileset3.png"},
	{id:"block", src:"assets/sprites/block.png"},
	{id:"mario-s", src:"assets/sprites/mario-small.png"},
	{id:"mario-b", src:"assets/sprites/mario-big.png"},
	{id:"bgm-og", src:"assets/music/og.mp3"},
	{id:"bgm-starman", src:"assets/music/starman.mp3"},
	{id:"bgm-die", src:"assets/music/die.mp3"},
	{id:"snd-bump", src:"assets/sound/bump.mp3"},
	{id:"snd-jump-small", src:"assets/sound/jump-small.mp3"},
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
	
	
	this.assets.tilesets = {};
	
	this.assets.music = null;
	this.assets.sfx = null;
	
	this.logicPause = false;
	this.eventAnim = 0;
	this.eventAnimTimer = 0;
	
	this.dieTimer = 0;
}

MarioGame.prototype = Object.create(Game.prototype);
MarioGame.prototype.constructor = MarioGame;


function playSound(snd) {
	if (game.audio.isPlaying) {
		createjs.Sound.play(snd);
	}
}

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
	return [ parseInt(chunk)*2 + parseInt(column) , block];
}

function getLevelCoords(chunk, column, block) {
	var tile = getLevelTile(chunk, column, block)
	return [ tile[0] * 16, tile[1] * 16 ]
}

var game;

function init() {
	
	game = new MarioGame();
	game.debug = 5;
	game.loadManifest(manifest, {audio:true});
}

function bringTheNoise() {
	$("#bringthenoise").prop("disabled",true)
	game.audio.isPlaying = true;
	if (window.location.protocol == 'file:') {
		console.log("bgm audio has been disabled for file: protocol")
		return;
	}
	game.audio.bgm.start(0);
	game.audio.bgm.hasStarted = true;
}

function changeBGM(id, loop) {
	if (window.location.protocol == 'file:') {
		return;
	}
	
	if (game.audio.bgm.hasStarted != null) {
		game.audio.bgm.stop();
	}

	game.audio.bgm = game.audio.context.createBufferSource();
	game.audio.bgm.buffer = game.assets.loader.getResult(id);
	if (loop == null) loop = false
	game.audio.bgm.loop = loop;
	
	game.audio.bgm.connect(game.audio.gainNode);
	
	if (game.audio.isPlaying) {
		game.audio.bgm.start(0);
		game.audio.bgm.hasStarted = true;
	}
	
	if (id == "bgm-og") {
		// Thankfully, the 1-1 music is the only instance in which an
		// intro section is not included when the music loops. 
		// It is exactly 1 measure long.
		game.audio.bgm.loopStart = 2.4015419501133786;
		game.audio.bgm.loopEnd = game.audio.bgm.buffer.duration;
	}
}

function onLoad(game) {
	game.assets.tilesets[1] = new createjs.SpriteSheet({
		images: [game.assets.loader.getResult("tileset1")],
		frames: {width:16, height:16}})
	game.assets.tilesets[2] = new createjs.SpriteSheet({
		images: [game.assets.loader.getResult("tileset2")],
		frames: {width:16, height:16}})
	game.assets.tilesets[3] = new createjs.SpriteSheet({
		images: [game.assets.loader.getResult("tileset3")],
		frames: {width:16, height:16}})
		
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	game.audio.context = new AudioContext();
	
	game.audio.gain = 0.5;
	game.audio.gainNode = game.audio.context.createGain();
	game.audio.gainNode.gain.value = game.audio.gain;
	game.audio.gainNode.connect(game.audio.context.destination);
	
	game.audio.bgm = game.audio.context.createBufferSource();
	
	createjs.Sound.volume = 0.5;
	
	begin(game);
}

function updateSpriteIndex(game, offset) {
	if (offset == null) offset = 0;
	game.world.container.setChildIndex(game.mario.container, game.world.container.numChildren - 1 - offset);
}

function resetLevel(game) {
	game.stage.removeChild(game.world.container);
	startLevel(game)
}

function startLevel(game) {
	game.logicPause = false;
	game.eventAnim = 0;
	game.eventAnimTimer = 0;
	
	game.dieTimer = 0;
	
	game.mario = new Mario(game);
	game.world = new MarioWorld(game, world[1][1]);
	game.stage.addChild(game.world.container);
	game.world.container.addChild(game.mario.container);
}

function begin(game) {
	startLevel(game);
	createInspectors(game);
}

function getInspectors(game) {
	var hBox = game.mario.getHitbox();
	var rval = [
		{id: "alive", val:game.mario.alive},
		{id: "ground", val:game.mario.ground},
		{id: "", val:" "},
		{id: "camerax", val:game.world.camerax, base:16},
		{id: "", val:" "},
		{id: "screenx", val:game.mario.screenx, base:16},
		{id: "xpos", val:game.mario.x, base:16},
		{id: "ypos", val:game.mario.y, base:16},
		{id: "absspeed", val:((Math.abs(game.mario.speed)&0xFFF00)/0x100), base:16},
		{id: "maxSpeed", val:((Math.abs(game.mario.maxSpeed)&0xFFF00)/0x100), base:16},
		{id: "dir", val:game.mario.dir},
		{id: "skid", val:game.mario.skid},
		{id: "", val:" "},
		{id: "yspeed", val:game.mario.ySpeed, base:16},
		{id: "MomentumDir", val:game.mario.momentumDir, base:16},
		{id: "Gravity", val:game.mario.gravity, base:16},
		{id: "GravityA", val:game.mario.gravityA, base:16},
		{id: "", val:" "},
		{id: "groundTest", val:game.mario.collision.groundTest},
		{id: "wallTest", val:game.mario.collision.wallTest},
		{id: "bumpTest", val:game.mario.collision.bumpTest},
		{id: "viewport", val:game.mario.screenystate},
		{id: "", val:" "},
		{id: "palette", val:game.mario.palette},
		{id: "frame", val:game.mario.frame},
	]
	return rval;
}

function createInspectors(game) {
	var inspectors = getInspectors(game)
	var id;
	var entry;
	for (var i in inspectors) {
		id = inspectors[i].id;
		entry = $("<div class='entry'>" + id + ": <span id='" + id + "'> - </span></div>")
		$("#inspectors").append(entry)
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

function audioTick(game) {
	//update gain values here
	game.audio.gainNode.gain.value = game.audio.gain;
}

MarioGame.prototype.doDieAnim = function() {
	this.mario.frame = 6;
	if (this.eventAnimTimer == 16) {
		this.mario.ySpeed = -0x4000;
	} else if (this.eventAnimTimer > 16) {
		this.mario.ySpeed += 0x280;
	}
	this.mario.updateCoords();
	this.mario.doGraphics();
}

function tick(event) {
	if (!event.paused || game.input.isKeyDown['tick']) {
		audioTick(game);
		
		// TODO: cycle coin and question block palettes
		// (happens regardless of logicPause)
		
		if (!game.logicPause) {
			game.input.tick();
			game.mario.doLogic(game);
			game.world.doLogic(game);
		} else {
			// An animation is happening (die, powerup, etc)
			
			switch(game.eventAnim) {
			case 1: // powerup
			case 2: // fire powerup
			case 3: // powerdown
			case 4: // flagpole
			case 5: // die
				game.doDieAnim();
				break;
			default:
				game.eventAnimTimer = 0;
				game.eventAnim = 0;
				game.logicPause = false;
				break;
			}
			
			game.eventAnimTimer++;
		}
		
		if (!game.mario.alive) {
			game.dieTimer++;
			if (game.dieTimer >= 210) {
				resetLevel(game)
			}
		}
		
		if (game.mario.showHitbox) {
			game.mario.drawHitbox(game);
		}
		game.stage.update();
		game.overlay.stage.update();
		updateInspectors(game)
	}
}