var tilePalSizes = [66,52,22,126,40];

var MarioWorld = function(game, level) {
	var map = level.chunks;
	var blockId = 0;
	var curBlock = null;
	
	this.game = game;
	
	this.level = [];
	
	this.container = new createjs.Container();
	this.container.y = -8;
	
	this.blocksContainer = new createjs.Container();
	this.container.addChild(this.blocksContainer)
	
	this.bgm = level.bgm;
	
	this.camerafixed = level.camerafixed;
	this.camerax = 0;
	
	this.palette = level.palette;
	this.ogPalette = level.ogPalette;
	
	this.worldType = level.worldType;
	
	// Animations
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
	
	this.objects = [];
	// Array of up to 5 enemies
	this.enemies = [];
	
	// Build the level
	
	switch(this.worldType) {
	case 1:
		game.mario.starmanPalettes = [3,6,7];
		break;
	case 2:
		game.mario.starmanPalettes = [3,8,7];
		break;
	case 3:
		game.mario.starmanPalettes = [3,9,10];
		break;
	case 0:
	default:
		game.mario.starmanPalettes = [3,4,5];
		break;
	}
	game.mario.starmanPalettes[3] = game.mario.defaultPalette;
	
	this.xtiles = 0;
	this.ytiles = 15;
	
	for (var chunk = 0; chunk < map.length; chunk++) {
		this.level.push([]);
		this.xtiles += 2;
		for (var column = 0; column < map[chunk].length; column++) {
			this.level[chunk].push([]);
			for (var block = 0; block < map[chunk][column].length; block++) {
				//console.log("chunk: " + chunk + " column: " + column + " block: " + block);
				this.level[chunk][column].push({});
				curBlock = map[chunk][column][block];
				if (typeof curBlock != "object") {
					blockId = curBlock
					curBlock = jQuery.extend({}, level.blocks[blockId])
				} else if (curBlock == null) {
					curBlock = {
						id: 0,
						tileset: null,
						tile: null
					}
				}
				
				curBlock.tx = parseInt(chunk)*2 + parseInt(column);
				curBlock.ty = parseInt(block)
				
				this.level[chunk][column][block] = curBlock;
				
				curBlock.bitmap = null;
				if (curBlock.tileset != null && curBlock.tile != null) {
					setTileBitmap(this, curBlock);
					this.blocksContainer.addChild(curBlock.bitmap);
				}
				
			}
		}
	}
	
	this.width = this.level.length * 32;
	
	$("#gameOverlay").css('background-color', level.bgColor);
	
	if (this.bgm != null) {
		changeBGM(this.bgm,true);
	}
}

// Returns a Block Object
MarioWorld.prototype.getBlockAtTile = function(coords) {
	var isValidInput = true;
	
	if (coords[0] < 0 || coords[0] >= this.xtiles) {
		isValidInput = false;
	}
	if (coords[1] < 0 || coords[1] >= this.ytiles) {
		isValidInput = false;
	}
	
	if (!isValidInput) {
		return {id: 0, bitmap:null}
	}
	
	return this.level[Math.floor(coords[0]/2)][coords[0]%2][coords[1]];
}

MarioWorld.prototype.startBumpAnim = function(coords) {
	var rCoords = getTileCoords(coords);
	var block = this.getBlockAtTile(coords);
	var p = (block.tileset == 1) ? this.palette : this.ogPalette;
	
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
		tilePalSizes[block.tileset - 1] * p + tid)
	this.bumpAnim.sprite.stop();
	this.blocksContainer.removeChild(block.bitmap)
	this.blocksContainer.addChild(this.bumpAnim.sprite)
	this.bumpAnim.sprite.x = this.bumpAnim.rx;
}

MarioWorld.prototype.doBumpAnim = function() {
	if (this.bumpAnim.frame >= 16) {
		var block = this.getBlockAtTile([this.bumpAnim.tx, this.bumpAnim.ty]);
		this.isBumpAnim = false;
		this.blocksContainer.removeChild(this.bumpAnim.sprite);
		this.blocksContainer.addChild(block.bitmap)
		
		// Change bumpable property if necessary
		if (typeof block.bump == 'number') {
			block.bump--;
			if (block.bump <= 0) {
				if (block.newtid != null) {
					block.tile = block.newtid
					setTileBitmap(this, block)
				}
				block.bump = false;
			}
		} // else if timeout?? (e.g. coin block in 1-2)
		
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


MarioWorld.prototype.doCamera = function(game) {
	
	if (game.mario.screenystate > 0) {
		// If we're below the screen, don't update camera position
		return;
	}
	
	var prevscreenx = game.mario.screenx
	game.mario.screenx = game.mario.x - this.camerax;
	if (game.mario.speed > 0) {
		if (game.mario.screenx > 0x500) {
			if ((game.mario.screenx - prevscreenx) >= 0x10 ) {
				this.camerax += Math.min(0x10, (game.mario.speed & 0xFF00) / 0x100);
			}
		} 
		if (game.mario.screenx > 0x700) {
			this.camerax = game.mario.x - 0x700;
		}
	}
	this.container.x = -(this.camerax & 0xFFFFFFF0) / 0x10;
}

MarioWorld.prototype.doLogic = function(game) {
	if (this.isBumpAnim) {
		this.doBumpAnim();
	}
	if (!this.camerafixed) {
		this.doCamera(game);
	}
}


function setTileBitmap(world, block) {
	var tx = block.tx;
	var ty = block.ty;
	var p = (block.tileset == 1) ? world.palette : world.ogPalette;
	var coords = getTileCoords([tx, ty]);
	if (block.bitmap == null) {
		block.bitmap = new createjs.Sprite(
			game.assets.tilesets[block.tileset], 
			tilePalSizes[block.tileset - 1] * p + block.tile);
		block.bitmap.stop();
		block.bitmap.x = coords[0];
		block.bitmap.y = coords[1];
	} else {
		block.bitmap.gotoAndStop(tilePalSizes[block.tileset - 1] * p + block.tile);
	}
	world.level[Math.floor(tx/2)][tx%2][ty] = block;
}
