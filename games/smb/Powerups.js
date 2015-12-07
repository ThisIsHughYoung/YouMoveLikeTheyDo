
function Powerup(game, coords) {
	Actor.call(this,game);
	
	// Enforce item limit: If there is a previously existing powerup
	// in memory, delete it before spawning the next one
	this.game.world.itemCount++;
	var i = 0;
	while (this.game.world.itemCount >= 2 && i < this.game.world.objects.length) {
		if (this.game.world.objects[i] instanceof Powerup) {
			this.game.world.objects[i].die();
		}
		i++;
	}
	this.game.world.itemCount = 1;
	
	this.ticks = 0;
	
	this.x = coords[0] * 0x100;
	this.y = coords[1] * 0x100 - 0x40;
	
	this.speed = 0;
	this.ySpeed = -0x400;
	
	this.wander = false;
	
	this.palette = game.world.palette;
	this.paletteSize = tilePalSizes[3];
	
	this.marioTest = false;
	
	/*
	this.sprite = new createjs.Sprite(game.assets.tilesets[4], 0);
	this.sprite.stop();
	
	this.container.addChild(this.sprite);
	game.world.container.addChild(this.container);
	*/
}

Powerup.prototype = Object.create(Actor.prototype);
Powerup.prototype.constructor = Powerup;

Powerup.prototype.doLogic = function() {
	if (!this.alive) {
		return;
	}
	
	if (this.ticks == 48) {
		this.wander = true;
		this.game.world.container.setChildIndex(this.container, this.game.world.container.numChildren - 2);
		this.move();
	}
	
	this.speed = Math.abs(this.speed) * this.dir;
	
	this.updateCoords();
	if (this.screenystate > 0) {
		this.die();
		return;
	}
	
	this.doCollisions();
	
	if (this.marioTest) {
		this.onHit();
		this.die();
		return;
	}
	
	this.doGraphics();
	
	this.ticks++;
}

Powerup.prototype.die = function() {
	this.game.world.container.removeChild(this.container);
	this.alive = false;
	this.game.world.itemCount--;
}

function Mushroom(game,coords) {
	Powerup.call(this,game,coords);
	
	this.frame = 0;
	
	this.sprite = new createjs.Sprite(game.assets.tilesets[4], 0);
	this.sprite.stop();
	
	this.container.addChild(this.sprite);
	this.game.world.container.addChild(this.container);
	
	this.game.world.container.setChildIndex(this.container, 0);
	
	this.onHit = function() {
		this.game.mario.grow();
	};
}

Mushroom.prototype = Object.create(Powerup.prototype);
Mushroom.prototype.constructor = Mushroom;

Mushroom.prototype.move = function() {
	this.ySpeed = 0;
	this.speed = 0x1000;
	this.dir = 1;
}

Mushroom.prototype.doCollisions = function() {
	if (this.wander) {
		var blCoord = [Math.floor(this.x / 0x10), Math.floor(this.y / 0x10) + 0x10];
		var brCoord = [Math.floor(this.x / 0x10) + 0x10, Math.floor(this.y / 0x10) + 0x10];
	
		var blTile = getTileAtPixel(blCoord);
		var brTile = getTileAtPixel(brCoord);
	
		var blBlock = game.world.getBlockAtTile(blTile);
		var brBlock = game.world.getBlockAtTile(brTile);
	
		if (blBlock.id == 1 || brBlock.id == 1) {
			if (blCoord[1] % 16 < 5) {
				if (!this.ground) {
					this.y = (this.y & 0xFFF00) + 0x10;
					this.ySpeed = 0;
				}
				this.ground = true;
			}
		} else {
			this.ground = false;
			this.ySpeed += 0x600;
		}
	
		var tlCoord = [Math.floor(this.x / 0x10), Math.floor(this.y / 0x10)];
		var trCoord = [Math.floor(this.x / 0x10) + 0x10, Math.floor(this.y / 0x10)];
	
		var tlTile = getTileAtPixel(tlCoord);
		var trTile = getTileAtPixel(trCoord);
	
		var tlBlock = game.world.getBlockAtTile(tlTile);
		var trBlock = game.world.getBlockAtTile(trTile);
	
		if (trBlock.id == 1 || brBlock.id == 1 && !this.ground) {
			this.dir = -1
		}
	
		if (tlBlock.id == 1 || blBlock.id == 1 && !this.ground) {
			this.dir = 1
		}
	}
	
	var tlCoord = [Math.floor(this.x / 0x10), Math.floor(this.y / 0x10)];
	var hbox = [tlCoord[0]+3,tlCoord[1]];
	var mhbox = this.game.mario.getHitbox();
	
	if (hbox[0] < mhbox.x + mhbox.w &&
		hbox[0] + 12 > mhbox.x &&
		hbox[1] < mhbox.y + mhbox.h &&
		hbox[1] + 12 > mhbox.y) {
			this.marioTest = true;
	}
	
}

function OneUp(game,coords) {
	Mushroom.call(this,game,coords);
	
	this.frame = 1;
	
	this.onHit = function() {
		playSound('snd-oneup');
	};
}

OneUp.prototype = Object.create(Mushroom.prototype);
OneUp.prototype.constructor = OneUp;

function Flower(game,coords) {
	Powerup.call(this,game,coords);
	
	// Tiles 18, 19, 20, 21 of tilesheet objects
	this.frame = (Math.floor(game.ticks / 2) % 4) + 18;
	
	this.sprite = new createjs.Sprite(game.assets.tilesets[4], 0);
	this.sprite.stop();
	
	this.container.addChild(this.sprite);
	this.game.world.container.addChild(this.container);
	
	this.game.world.container.setChildIndex(this.container, 0);
	
	this.onHit = function() {
		this.game.mario.grow();
	};
}

Flower.prototype = Object.create(Powerup.prototype);
Flower.prototype.constructor = Flower;

Flower.prototype.move = function() {
	this.ySpeed = 0;
	this.speed = 0;
	this.dir = 0;
}

Flower.prototype.doCollisions = function() {
	var tlCoord = [Math.floor(this.x / 0x10), Math.floor(this.y / 0x10)];
	var hbox = [tlCoord[0]+3,tlCoord[1]];
	var mhbox = this.game.mario.getHitbox();
	
	if (hbox[0] < mhbox.x + mhbox.w &&
		hbox[0] + 12 > mhbox.x &&
		hbox[1] < mhbox.y + mhbox.h &&
		hbox[1] + 12 > mhbox.y) {
			this.marioTest = true;
	}
}

Flower.prototype.doGraphics = function() {
	this.frame = (Math.floor(this.game.ticks / 2) % 4) + 18;
	Powerup.prototype.doGraphics.call(this)
}

function Starman(game,coords) {

	Powerup.call(this,game,coords);

	this.frame = (Math.floor(this.game.ticks / 2) % 4) + 27;
	
	this.sprite = new createjs.Sprite(game.assets.tilesets[4], 0);
	this.sprite.stop();
	
	this.container.addChild(this.sprite);
	this.game.world.container.addChild(this.container);
	
	this.game.world.container.setChildIndex(this.container, 0);
	
	this.onHit = function() {
		playSound('snd-powerup');
		this.game.mario.beginStarman();
	};
}

Starman.prototype = Object.create(Powerup.prototype);
Starman.prototype.constructor = Starman;

Starman.prototype.move = function() {
	this.ySpeed = 0;
	this.speed = 0x1000;
	this.dir = 1;
	this.tangible = false;
	this.ground = false;
}

Starman.prototype.doCollisions = function() {
	if (this.ticks == 64) {
		this.tangible = true;
	}
	
	if (this.wander && this.tangible) {
		var blCoord = [Math.floor(this.x / 0x10), Math.floor(this.y / 0x10) + 0x10];
		var brCoord = [Math.floor(this.x / 0x10) + 0x10, Math.floor(this.y / 0x10) + 0x10];
	
		var blTile = getTileAtPixel(blCoord);
		var brTile = getTileAtPixel(brCoord);
	
		var blBlock = game.world.getBlockAtTile(blTile);
		var brBlock = game.world.getBlockAtTile(brTile);
		this.ground = false;
		if (this.ySpeed >= 0) {
			if (blBlock.id == 1 || brBlock.id == 1) {
				if (blCoord[1] % 16 < 5) {
					if (!this.ground) {
						this.y = (this.y & 0xFFF00) + 0x10;
						// Make the star 'hop'
						this.ySpeed = -0x3000;
					}
					this.ground = true;
				}
			}
		}
	
		if (brBlock.id == 1 && !this.ground) {
			this.dir = -1
		}
	
		if (blBlock.id == 1 && !this.ground) {
			this.dir = 1
		}
	}
	
	if (!this.ground) {
		this.ySpeed += 0x1B0;
	}
	
	var tlCoord = [Math.floor(this.x / 0x10), Math.floor(this.y / 0x10)];
	var hbox = [tlCoord[0]+3,tlCoord[1]];
	var mhbox = this.game.mario.getHitbox();
	
	if (hbox[0] < mhbox.x + mhbox.w &&
		hbox[0] + 12 > mhbox.x &&
		hbox[1] < mhbox.y + mhbox.h &&
		hbox[1] + 12 > mhbox.y) {
			this.marioTest = true;
	}
}

Starman.prototype.doGraphics = function() {
	this.frame = (Math.floor(this.game.ticks / 2) % 4) + 27;
	Powerup.prototype.doGraphics.call(this)
}
