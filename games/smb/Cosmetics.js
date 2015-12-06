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
		
		// spawn item if it exists
		
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

