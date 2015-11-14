
var sprite;
var spritesheet;

var manifest = [
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
	Game.call(this, "Super Mario Bros.", 256, 240, defaultKeybinds);
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
	walkMaxSpeed: 0x018FF,
	runMaxSpeed: 0x028FF,
	skidTurnSpeed: 0x00AFF,
}

function Mario(game) {
	this.game = game;
	
	this.ground = true;
	
	this.walking = false;
	this.skid = false;
	this.skiddir = 0;
	
	this.isJumpAllowed = true;
	
	this.state = 0;
	this.substate = 0;
	this.dir = 1;
	this.idir = 1;
	
	this.walkcycleIndex = 0;
	this.walkcycleFrame = 0;
	
	this.isRun = false;
	
	this.speed = 0;
	this.ySpeed = 0;
	
	this.maxSpeed = 0x18FF;
	
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
		this.state = 0;
		this.ySpeed = 0;
		this.y = (getTileCoords(this.getCurTile())[1] * 0x10);
		//console.log(getTileCoords(this.getCurTile())[1])
	}
}


Mario.prototype.doGround = function(game) {
	/*if (this.ground) {
		if (game.input.isKeyDown['a'] && this.isJumpAllowed) {
			this.state = 3;
			this.sprite.gotoAndPlay('jump');
			this.ySpeed = -0x4000;
			this.doAir(game);
		} 
	}*/
	
	var skidrate = marioDefaults.skidDecel;
	var accelrate = 0;
	var speedchange = 0;
	var isLeft = (game.input.kb['left']) ? true:false;
	var isRight = (game.input.kb['right']) ? true:false;
	var isInput = (isLeft || isRight) ? true : false;
	var horzMotion = (this.speed != 0) ? true : false;
	
	// process B logic
	if (game.input.kb['b']) {
		this.isRun = true;
		this.framesSinceBReleased = 0;
	} else {
		if (this.framesSinceBReleased >= 10) {
			this.isRun = false;
		} else {
			this.framesSinceBReleased++;
		}
	}
	
	// set speed variables (using isRun logic)
	if (this.isRun) {
		this.maxSpeed = marioDefaults.runMaxSpeed;
		accelrate = marioDefaults.runAccel;
	} else {
		this.maxSpeed = marioDefaults.walkMaxSpeed;
		accelrate = marioDefaults.walkAccel;
	}
	
	// The following variables exist to simulate
	// SMB moonwalking! (hee hee!)
	var tempMDir = 0;
	if (this.speed > 0) {
		tempMDir = 1;
	} else {
		tempMDir = 2;
	}
	
	// Always set direction towards button press
	if (isInput) {
		this.idir = 0;
		if (isLeft) {
			this.dir = -1;
			this.idir = this.idir | 2;
		}
		if (isRight) {
			this.dir = 1;
			this.idir = this.idir | 1;
		}
	}
	
	
	
	
	if (this.speed != 0) {
		// Walking and Skidding logic 
		
		
		// If the direction of our movement
		// differs from the direction we're facing,
		// Mario should be skidding
		/*if (isInput && tempMDir != this.idir) {
			this.skid = true;
		}*/
		
		
		if (this.idir != tempMDir) {
			this.maxSpeed = marioDefaults.walkMaxSpeed;
			this.skid = true;
			// If we're moving too slow, don't decelerate!
			// (Matches NES behaviour)
			if (Math.abs(this.speed) > marioDefaults.skidTurnSpeed) {
				this.skid = true;
				this.speed += skidrate * this.dir;
			} else {
				this.speed = 0;
				this.skid = false;
			}
		} else {
			//this.skid = false;
			if (!isInput) {
				if (Math.abs(this.speed) > marioDefaults.releaseDecel) {
					this.speed += marioDefaults.releaseDecel * -(Math.sign(this.speed))
				} else {
					this.speed = 0;
					speedchange = 0;
				}
			} else {
				//speedchange = accelrate * this.dir;
				this.speed += accelrate * this.dir;
			}
		}
		if (tempMDir & 2) {
			this.speed = Math.max(this.speed, -this.maxSpeed);
		} else {
			this.speed = Math.min(this.speed, this.maxSpeed);
		}
		
	}
	
	if (this.speed == 0) {
   		//Standing Logic
   		if (isLeft) {
   			this.speed = -0x130;
   			this.dir = -1;
   		}
   		if (isRight) {
   			this.speed = 0x130;
   			this.dir = 1;
   		}
   	} 
	
	
	// do animation
	if ((Math.abs(this.speed)) == 0) {
		if (this.sprite.currentAnimation != 'stand') {
			this.sprite.gotoAndPlay('stand');
		}
	} else if (this.idir & tempMDir || Math.abs(this.speed) < 0x200) {
		this.doWalkCycle();
	} else {
		if (this.sprite.currentAnimation != 'skid') {
			this.sprite.gotoAndPlay('skid');
		}
	}
}

Mario.prototype.doLogic = function(game) {
	
	//this.doCollision(game);
	if (this.ground) {
		//this.doGround(game);
	} else {
		//doAir?!?
	}
	
	switch (this.state) {
	case 0: //standing
		this.doGround(game)
		break;
		//TODO: fix the switch/case!
	case 3:
		//this.doAir(game);
	default:
		break;
	}
	
	this.x += (this.speed - (this.speed & 0xFF)) / 0x100;
	this.y += (this.ySpeed - (this.ySpeed & 0xFF)) / 0x100;
	
	if (this.idir & 2) {
		this.sprite.scaleX = -1;
	} else {
		this.sprite.scaleX = 1;
	}
	
	this.sprite.x = (this.x - (this.x & 0xF)) / 0x010;
	this.sprite.y = (this.y - (this.y & 0xF)) / 0x010;
	if (this.sprite.scaleX == -1) {
		this.sprite.x += 16;
	}
	
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
		this.walkcycleIndex = 0;
		this.walkcycleFrame = 1;
	} else {
		this.walkcycleFrame--;
		if (this.walkcycleFrame <= 0) {
			this.walkcycleIndex++;
			if (this.walkcycleIndex > 2) {
				this.walkcycleIndex = 0
			}
			if (Math.abs(this.speed) < 0xe40) {
				this.walkcycleFrame = 7;
			} else if (Math.abs(this.speed) < 0x1C70) {
				this.walkcycleFrame = 4;
			} else {
				this.walkcycleFrame = 2;
			}
		}
	}
	
	if (this.sprite.currentFrame != this.walkcycleIndex + 1) {
		this.sprite.gotoAndStop(this.walkcycleIndex + 1);
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
	
	createInspectors(game)
	
}

function getInspectors(game) {
	var rval = [
		{id: "absspeed", val:((Math.abs(game.mario.speed)&0xFFF00)/0x100), base:16},
		{id: "dir", val:game.mario.dir},
		{id: "skid", val:game.mario.skid},
		{id: "maxSpeed", val:((Math.abs(game.mario.maxSpeed)&0xFFF00)/0x100), base:16}
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
		if ( 'base' in inspectors[i] ) {
			if (inspectors[i].base == 16) {
				str = "0x" + inspectors[i].val.toString(inspectors[i].base);
			}
		}
		$("#" + id).text(str);
	}
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
		updateInspectors(game)
	}
	
}