// Cosmetics
// A place to round up objects which do not actually affect gameplay
// (simply here to recreate Nintendo's visual flair)

function BumpAnim(game, world, coords) {

	Actor.call(this, game);
	
	this.world = world;
	
	// Time to live: this animation always lasts 16 frames
	this.ttl = 16;
	
	this.x = coords[0] * 0x100;
	this.y = coords[1] * 0x100;
	this.tx = coords[0];
	this.ty = coords[1];
	
	this.speed = 0;
	this.ySpeed = -0x2000;
	
	this.block = world.getBlockAtTile([this.tx,this.ty]);
	this.paletteSize = tilePalSizes[this.block.tileset - 1];
	this.palette = (this.block.tileset == 1) ? world.palette : world.ogPalette
	this.frame = (this.block.bumptid == null) ? this.block.tile : this.block.bumptid;
	
	this.sprite = new createjs.Sprite(game.assets.tilesets[this.block.tileset], 0);
	this.sprite.stop();
	
	// Temporarily remove the actual block tile from the world and replace it with
	// our own sprite (NES: this means removing the block from the background
	// layer and replacing it in the sprite layer)
	world.blocksContainer.removeChild(this.block.bitmap)
	this.container.addChild(this.sprite);
	world.blocksContainer.addChild(this.container);
}

BumpAnim.prototype = Object.create(Actor.prototype);
BumpAnim.prototype.constructor = BumpAnim;

BumpAnim.prototype.doLogic = function() {
	
	if (this.ttl <= 0) {
		// Time-to-live = 0: The animation has ended, return the
		// original tile in its place, changing its bitmap if
		// necessary.
		this.world.blocksContainer.removeChild(this.container);
		this.world.blocksContainer.addChild(this.block.bitmap)
		
		// Change bumpable property if necessary
		if (typeof this.block.bump == 'number') {
			this.block.bump--;
			if (this.block.bump <= 0) {
				if (this.block.newtid != null) {
					this.block.tile = this.block.newtid
					setTileBitmap(this.world, this.block)
				}
				this.block.bump = false;
			}
		} // else if timeout?? (e.g. coin block in 1-2)
		
		this.block.id = 1;
		
		// spawn item if it exists
		if (this.block.item != null) {
			switch(this.block.item) {
			case 'mushroom':
				if (this.game.mario.isBig) {
					this.world.objects.push(new Flower(this.game, [this.tx,this.ty]))
				} else {
					this.world.objects.push(new Mushroom(this.game, [this.tx,this.ty]))
				}
				break;
			case 'starman':
				this.world.objects.push(new Starman(this.game,[this.tx,this.ty]))
				break;
			case '1up':
				this.world.objects.push(new OneUp(this.game, [this.tx,this.ty]))
				break;
			case 'coin':
				// Coin spawns at the beginning of the animation, not here.
			default:
				break;
			}
		}
		
		// Set alive to false so this object gets deleted by 
		// sweepActorArray on the next tick
		this.alive = false;
		
		this.world.isBumpAnim = false;
		
		return;
	}
	
	if (this.ttl == 1) {
		this.ySpeed = 0;
		this.y = this.ty * 0x100;
	}
	
	this.updateCoords();
	this.doGraphics();
	
	this.ySpeed += 0x0500;
	
	this.ttl--;
}

function BreakAnim(game, world, coords, dir, initialSpeed) {
	Actor.call(this, game);
	
	this.world = world;
	
	this.ticks = 0;
	
	this.x = coords[0] * 0x10;
	this.y = coords[1] * 0x10 + 0x10;
	
	this.speed = 0x1000 * dir;
	this.ySpeed = 0;
	
	this.maxFallSpeed = 0xFFFFFF;
	
	this.initialSpeed = initialSpeed;
	
	this.block = world.getBlockAtTile(coords);
	this.paletteSize = tilePalSizes[4];
	this.palette = world.palette
	// tiles 26, 27, 28, 29, depending on game tick counter
	this.frame = this.frame = (Math.floor(game.ticks / 8) % 4) + 26;;
	
	this.sprite = new createjs.Sprite(game.assets.tilesets[5], 0);
	this.sprite.stop();
	
	this.container.addChild(this.sprite);
	world.blocksContainer.addChild(this.container);
}

BreakAnim.prototype = Object.create(Actor.prototype);
BreakAnim.prototype.constructor = BreakAnim;

BreakAnim.prototype.doLogic = function() {
	
	if (this.ticks == 1) {
		this.ySpeed = this.initialSpeed;
	} else if (this.ticks > 1) {
		this.ySpeed += 0x0600;
	}
	
	this.updateCoords();
	
	if (this.screenystate > 0) {
		this.die();
		return;
	}
	
	if (this.game.ticks % 8 == 0) {
		this.frame = (Math.floor(game.ticks / 8) % 4) + 26;
	}
	
	this.doGraphics();
	
	this.ticks++;
}

BreakAnim.prototype.die = function() {
	this.world.blocksContainer.removeChild(this.container);
	this.world.brickbits--;
	this.alive = false;
}

function CoinAnim(game, world, coords) {
	Actor.call(this, game);
	
	this.world = world;
	
	this.ttl = 32;
	
	this.x = coords[0] * 0x100;
	this.y = coords[1] * 0x100;
	
	this.speed = 0;
	this.ySpeed = -0x5000;
	
	this.maxFallSpeed = 0xFFFFFF;
	
	this.block = world.getBlockAtTile(coords);
	this.paletteSize = tilePalSizes[3];
	this.palette = world.palette
	// tiles 63,64,65,66 depending on game tick counter
	this.frame = (Math.floor(game.ticks / 2) % 4) + 63;
	
	this.sprite = new createjs.Sprite(game.assets.tilesets[4], 0);
	this.sprite.stop();
	
	this.container.addChild(this.sprite);
	world.container.addChild(this.container);
}

CoinAnim.prototype = Object.create(Actor.prototype);
CoinAnim.prototype.constructor = CoinAnim;

CoinAnim.prototype.doLogic = function() {
	if (this.ttl <= 0) {
		this.die();
	}
	
	if (this.game.ticks % 2 == 0) {
		this.frame = (Math.floor(game.ticks / 2) % 4) + 63;
	}
	
	this.updateCoords();
	this.doGraphics();
	
	this.ySpeed += 0x500;
	
	this.ttl--;
}
CoinAnim.prototype.die = function() {
	this.world.container.removeChild(this.container);
	this.alive = false;
	// TODO: add point display
}
