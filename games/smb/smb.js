
var manifest = [
	{id:"tileset1", src:"assets/sprites/tileset1.png"},
	{id:"tileset2", src:"assets/sprites/tileset2.png"},
	{id:"tileset3", src:"assets/sprites/tileset3.png"},
	{id:"block", src:"assets/sprites/block.png"},
	{id:"mario-s", src:"assets/sprites/mario-small.png"},
	{id:"mario-b", src:"assets/sprites/mario-big.png"},
	{id:"bgm-og", src:"assets/music/og.mp3"},
	{id:"bgm-starman", src:"assets/music/starman.mp3"},
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
	
	// block "bump" animation
	this.isBumpAnim = false;
	this.bumpAnim = {
		tx: 0,
		ty: 0,
		rx: 0,
		ry: 0,
		frame: 0,
		ySpeed: 0,
		yOffset: 0,
		block: null,
		sprite: null,
		newTID: 0
		
	}
	
	this.assets.tilesets = {};
	
	this.assets.music = null;
	this.assets.sfx = null;
}

MarioGame.prototype = Object.create(Game.prototype);
MarioGame.prototype.constructor = MarioGame;

MarioGame.prototype.startBumpAnim = function(coords) {
	var rCoords = getTileCoords(coords);
	var block = this.world.getBlockAtTile(coords);
	
	if (block.bump == null || block.bump == false || this.isBumpAnim) {
		return;
	}
	
	var tid = (block.bumptid == null) ? block.tile : block.bumptid;
	block.id = 1;
	this.isBumpAnim = true;
	this.bumpAnim.frame = 0;
	this.bumpAnim.tx = coords[0];
	this.bumpAnim.ty = coords[1];
	this.bumpAnim.rx = rCoords[0];
	this.bumpAnim.ry = rCoords[1];
	this.ySpeed = 0;
	this.yOffset = 0;
	
	this.bumpAnim.sprite = new createjs.Sprite(game.assets.tilesets[block.tileset], 
		this.world.palettes[block.tileset - 1] + tid)
	this.bumpAnim.sprite.stop();
	this.world.container.removeChild(block.bitmap)
	this.world.container.addChild(this.bumpAnim.sprite)
	this.bumpAnim.sprite.x = this.bumpAnim.rx;
	
	console.log("Bumped block " + coords);
}

function playSound(snd) {
	if (game.audio.isPlaying) {
		createjs.Sound.play(snd);
	}
}

MarioGame.prototype.doBumpAnim = function() {
	if (this.bumpAnim.frame >= 16) {
		var block = this.world.getBlockAtTile([this.bumpAnim.tx, this.bumpAnim.ty]);
		this.isBumpAnim = false;
		this.world.container.removeChild(this.bumpAnim.sprite);
		this.world.container.addChild(block.bitmap)
		
		// Change bumpable property if necessary
		if (typeof block.bump == 'number') {
			block.bump--;
			if (block.bump <= 0) {
				if (block.newtid != null) {
					block.tile = block.newtid
					setTileBitmap(this.world, block)
				}
				block.bump = false;
			}
		} // else if timeout??
		
		// spawn item if it exists
		
		// Flush mario's sprite back to top
		updateSpriteIndex(game);
		return;
	} else if (this.bumpAnim.frame >= 15) {
		this.bumpAnim.ySpeed = 0;
		this.bumpAnim.yOffset = 0;
	} else if (this.bumpAnim.frame == 0) {
		this.bumpAnim.ySpeed = -0x20;
	} else {
		this.bumpAnim.ySpeed += 0x05;
	}
	this.bumpAnim.yOffset += this.bumpAnim.ySpeed;
	
	this.bumpAnim.sprite.y = (this.bumpAnim.ry * 0x10) + this.bumpAnim.yOffset;
	this.bumpAnim.sprite.y = (this.bumpAnim.sprite.y & 0xFFFFF0) / 0x10;
	this.bumpAnim.frame++;
}

MarioGame.prototype.doCamera = function() {
	var prevscreenx = this.mario.screenx
	this.mario.screenx = this.mario.x - this.world.camerax;
	if (this.mario.speed > 0) {
		if (this.mario.screenx > 0x500) {
			if ((this.mario.screenx - prevscreenx) >= 0x10 ) {
				this.world.camerax += Math.min(0x10, (this.mario.speed & 0xFF00) / 0x100);
			}
		} 
		if (this.mario.screenx > 0x700) {
			this.world.camerax = this.mario.x - 0x700;
		}
	}
	this.world.container.x = -(this.world.camerax & 0xFFFFFFF0) / 0x10;
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
		{id: "ground", val:game.mario.ground},
		{id: "", val:" "},
		{id: "yspeed", val:game.mario.ySpeed, base:16},
		{id: "MomentumDir", val:game.mario.momentumDir, base:16},
		{id: "Gravity", val:game.mario.gravity, base:16},
		{id: "GravityA", val:game.mario.gravityA, base:16},
		{id: "collision-tl", val:hBox.x, base:16},
		{id: "collision-tr", val:hBox.y, base:16},
		{id: "groundTest", val:game.mario.collision.groundTest},
		{id: "wallTest", val:game.mario.collision.wallTest},
		{id: "bumpTest", val:game.mario.collision.bumpTest},
		{id: "levelEntryFlag", val:game.mario.levelEntryFlag}
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

function tick(event) {
	if (!event.paused || game.input.isKeyDown['tick']) {
		audioTick(game);
		
		game.input.tick();
		game.mario.doLogic(game);
		if (game.mario.showHitbox) {
			game.mario.drawHitbox(game);
		}
		if (game.isBumpAnim) {
			game.doBumpAnim();
		}
		if (!game.world.camerafixed) {
			game.doCamera();
		}
		game.stage.update();
		game.overlay.stage.update();
		updateInspectors(game)
	}
}