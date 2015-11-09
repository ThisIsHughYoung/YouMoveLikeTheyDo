
var sprite;
var spritesheet;

var manifest = [
	{id:"derp", src:"assets/sprites/derp.png"},
	{id:"block", src:"assets/sprites/block.png"},
	{id:"mario", src:"assets/sprites/mario.png"}
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

function DerpGame() {
	Game.call(this, "Derp", 256, 240, defaultKeybinds);
	this.begin = begin;
	this.tick = tick;
	this.mario = null;
	this.resizeFrame(2);
	this.world = null;
}

DerpGame.prototype = Object.create(Game.prototype);
DerpGame.prototype.constructor = DerpGame

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
	walkMaxSpeed: 0x01900,
	runMaxSpeed: 0x02900,
	skidTurnSpeed: 0x00900,
}

function Mario(game) {
	this.game = game;
	
	this.ground = true;
	this.isJumpAllowed = true;
	
	this.state = 0;
	this.substate = 0;
	this.dir = 1;
	this.animstep = 0;
	
	this.isRun = false;
	
	this.speed = 0;
	this.ySpeed = 0;
	
	this.x = 0;
	this.y = 0xBC0;
	
	this.framesSinceBReleased = 0;
	
	this.spritesheet = new createjs.SpriteSheet({
		images: [this.game.assets.getResult("mario")],
		frames: {width:16,height:16,count:13,regX:0,regY:15},
		animations: smallMarioAnim
	})
	this.sprite = new createjs.Sprite(this.spritesheet, "stand");
}

Mario.prototype.getPixelCoords = function() {
	return [(this.x - (this.x & 0xF)) / 0x010, (this.y - (this.y & 0xF)) / 0x010];
}

Mario.prototype.getCurTile = function() { 
	return getTileAtPixel(this.getPixelCoords())
}

Mario.prototype.isOnTile = function() {
	return (game.world.getBlockAtTile(this.getCurTile()).id == 1)
}

Mario.prototype.doCollision = function(game) {
	var onTile = this.isOnTile()
	//console.log("ground: " + this.ground + ", onTile: " + onTile)
	if (this.ground && !onTile) {
		this.ground = false;
		this.state = 3;
	} else if (!this.ground && onTile) {
		console.log("trigger")
		this.ground = true;
		this.state = 1;
		this.ySpeed = 0;
		this.y = (getTileCoords(this.getCurTile())[1] * 0x10);
		//console.log(getTileCoords(this.getCurTile())[1])
	}
}

Mario.prototype.doGround = function(game) {
	if (this.ground) {
		if (game.input.isKeyDown['a'] && this.isJumpAllowed) {
			this.state = 3;
			this.sprite.gotoAndPlay('jump');
			this.ySpeed = -0x4000;
			this.doAir(game);
		} 
	}
}

Mario.prototype.doLogic = function(game) {
	
	this.doCollision(game);
	if (this.ground) {
		this.doGround(game);
	} else {
		//doAir?!?
	}
	
	switch (this.state) {
	case 0: //standing
		this.doStand(game)
		break;
	case 1: //walking & running (substate)
		this.doWalk(game)
		break;
	case 2:
		this.doSkid(game);
		break;
	case 3:
		this.doAir(game);
	default:
		break;
	}
	
	this.x += (this.speed - (this.speed & 0xFF)) / 0x100;
	this.y += (this.ySpeed - (this.ySpeed & 0xFF)) / 0x100;
	
	this.sprite.scaleX = this.dir;
	
	this.sprite.x = (this.x - (this.x & 0xF)) / 0x010;
	this.sprite.y = (this.y - (this.y & 0xF)) / 0x010;
	if (this.dir == -1) {
		this.sprite.x += 16;
	}
	
}

Mario.prototype.doStand = function(game) {
	
	if (this.sprite.currentAnimation != 'stand') {
		this.sprite.gotoAndPlay('stand');
	}
	
	if (game.input.kb['right'] && game.input.kb['left']) {
		// I call bullshit.
		return;
	}
	
	if (game.input.kb['right']) {
		this.state = 1; // switch to run mode
		this.dir = 1;
		this.doWalk(game)
	} else if (game.input.kb['left']) {
		this.state = 1;
		this.dir = -1;
		this.doWalk(game)
	}
}

Mario.prototype.getCurDir = function() {
	if (this.dir == -1) {
		return 'left';
	}
	return 'right';
}

Mario.prototype.getOppDir = function() {
	if (this.dir == -1) {
		return 'right';
	}
	return 'left';
}

Mario.prototype.doWalk = function(game) {
	
	if (game.input.kb['b']) {
		this.isRun = true;
	}
	
	if (game.input.kb[this.getOppDir()] && !game.input.kb[this.getCurDir()]) {
		// User pressed opposite direction. Switch state
		// to skidding and process those rules instead.
		this.state = 2;
		this.isRun = false;
		this.dir = -this.dir;
		this.doSkid(game);
		// return, so we don't process any Walk state logic
		return;
		
	} else if (game.input.kb[this.getCurDir()] && !game.input.kb[this.getOppDir()]) {
		
		// Moving Forward
		if (!this.isRun) {
			// Walking Logic
			this.speed += (marioDefaults.walkAccel * this.dir);

			//Clamp running speed within game limits
			this.speed = Math.min(Math.abs(this.speed), marioDefaults.walkMaxSpeed) * this.dir;
			this.speed = Math.max(Math.abs(this.speed), marioDefaults.minSpeed) * this.dir;			
		} else {
			// Running Logic
			if (!game.input.kb['b']) {
				this.framesSinceBReleased++;
			} else {
				this.framesSinceBReleased = 0;
			}
			if (this.framesSinceBReleased > 10) {
				// Nintendo's "Ten Frames Rule": When B is released, Mario maintains running
				// speed for 10 frames, after which he instantly returns to walking speed.
				// This way, the player can shoot fireballs without slowing down.
				this.speed = Math.min(Math.abs(this.speed), marioDefaults.walkMaxSpeed) * this.dir;
				this.isRun = false;
			} else {
				this.speed += (marioDefaults.runAccel * this.dir);
				// Clamp running speed within game limits
				this.speed = Math.min(Math.abs(this.speed), marioDefaults.runMaxSpeed) * this.dir;
				this.speed = Math.max(Math.abs(this.speed), marioDefaults.minSpeed) * this.dir;
			}
		}
	} else {
		// No input, or both directions pressed: decelerate to halt
		if (Math.abs(this.speed) < marioDefaults.releaseDecel) {
			this.state = 0;
			this.isRun = false;
			this.speed = 0;
			// Don't call doStand() yet, we'll wait until next
			// frame for the state change to take effect.
		} else {
			this.speed -= (marioDefaults.releaseDecel * this.dir);
		}
	}
	
	// Update the walking animation
	this.doWalkCycle();
}

// MARIO'S WALK CYCLE - "DO THE MARIO!"
//
// These rules compiled by cross-referencing the following
// NES memory addresses in emulator: 
// 0x700 - current speed (Pixel & Subpixel)
// 0x70c - number of frames to display this walk sprite index
// 0x70d - current sprite index
Mario.prototype.doWalkCycle = function() {
	if (this.sprite.currentFrame < 1 || this.sprite.currentFrame > 3) {
		
		this.sprite.gotoAndStop(1);
		this.animstep = 1;
		
	} else {
		
		this.animstep--;
		if (this.animstep == 0) {
			if (this.sprite.currentFrame == 1) {
				this.sprite.gotoAndStop(3);
			} else {
				this.sprite.gotoAndStop(this.sprite.currentFrame - 1);
			}
			
			if (Math.abs(this.speed) < 0xe40) {
				this.animstep = 7;
			} else if (Math.abs(this.speed) < 0x1C70) {
				this.animstep = 4;
			} else {
				this.animstep = 2;
			}
		}
		
	}
}

Mario.prototype.doSkid = function(game) {
	if (this.sprite.currentAnimation != 'skid') {
		this.sprite.gotoAndPlay('skid');
	}
	
	if (game.input.isKeyDown[this.getOppDir()]) {
		// Player 'cancels out' skid, Mario turns around
		// and continues in original direction.
		this.dir = -this.dir;
		this.state = 1;
		this.doWalk(game);
		return;
	} else {
		// Skid to a halt, even if player has released "skid" button
		this.speed += (marioDefaults.skidDecel * this.dir);
	}
	if (Math.abs(this.speed) < marioDefaults.skidTurnSpeed) {
		// skidTurnSpeed is the threshold where Mario stops
		// skidding and gets his footing.
		this.speed = 0;
		this.state = 1;
		this.doWalk(game);
	}
}

Mario.prototype.doAir = function(game) {
	// Don't change the sprite! This is to match NES behaviour
	if (game.input.kb['a']) {
		this.ySpeed += 0x200;
	} else {
		this.ySpeed += 0x700;
	}
	
	if (this.isOnTile()) {
		//do projection;
	}
	
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

// a chunk is made up of 2 columns of 16x16 blocks
var defaultChunk = [
	[0,0,0,0,0,0,0,0,1,0,0,0,1,1],
	[0,0,0,0,0,0,0,0,0,0,0,0,1,1]
]

var worldoneone = [
	defaultChunk,
	defaultChunk,
	defaultChunk,
	defaultChunk,
	defaultChunk,
	defaultChunk,
	defaultChunk,
	defaultChunk,
	defaultChunk
]

var MarioWorld = function(game) {
	this.level = [];
	
	this.container = new createjs.Container();
	
	for (var chunk in worldoneone) {
		this.level.push([]);
		for (var column in worldoneone[chunk]) {
			this.level[chunk].push([]);
			for (var block in worldoneone[chunk][column]) {
				this.level[chunk][column].push({});
				switch (worldoneone[chunk][column][block]) {
				case 0:
					// empty: do nothing
					this.level[chunk][column][block] = {
						id: 0,
						bitmap: null
					};
					break;
				case 1:
					this.level[chunk][column][block] = {
						id: 1,
						bitmap: new createjs.Bitmap(game.assets.getResult('block'))
					};
					var coords = getLevelCoords(parseInt(chunk), parseInt(column), parseInt(block));
					this.level[chunk][column][block].bitmap.x = coords[0];
					this.level[chunk][column][block].bitmap.y = coords[1];
					this.container.addChild(this.level[chunk][column][block].bitmap)
					break;
				}
			}
		}
	}
	
	this.width = this.level.length * 32;
	
}

// Returns a Block Object
MarioWorld.prototype.getBlockAtTile = function(coords) {
	return this.level[Math.floor(coords[0]/2)][coords[0]%2][coords[1]];
}


var game;

function init() {
	game = new DerpGame();
	game.debug = 5;
	game.loadManifest(manifest, true);
}

function begin(game) {
	game.mario = new Mario(game);
	game.mario.sprite.x = 0;
	game.mario.sprite.y = 100;
	block = new createjs.Bitmap(game.assets.getResult("block"));
	block.x = 0;
	block.y = 66;
	var line = new createjs.Shape();
	line.graphics.setStrokeStyle(1,0,0,10,true).beginStroke("#999").moveTo(0,66.5).lineTo(1000,66.5);
	var line2 = new createjs.Shape();
	line2.graphics.setStrokeStyle(1,0,0,10,true).beginStroke("#ccc").moveTo(0,100.5).lineTo(100,100.5);
	game.stage.addChild(line);
	game.stage.addChild(block);
	game.stage.addChild(game.mario.sprite);
	
	game.world = new MarioWorld(this);
	game.stage.addChild(this.world.container);
	
	//game.stage.addChild(line2);
	game.stage.update();
	
}

function tick(event) {
	if (!event.paused || game.input.isKeyDown['tick']) {
		if (game.input.kb['down']) {
			game.mario.y += (0x1000);
		}
		game.input.tick();
		game.mario.doLogic(game);
		game.stage.update();
		game.overlay.stage.update();
	}
}