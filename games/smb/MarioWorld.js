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
	var block = this.getBlockAtTile(coords);
	var p = (block.tileset == 1) ? this.palette : this.ogPalette;
	
	if (block.bump == null || block.bump == false || this.isBumpAnim) {
		return;
	}
	this.isBumpAnim = true;
	var b = new BumpAnim(this.game, this, coords)
	this.objects.push(b);
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
	if (!this.camerafixed) {
		this.doCamera(game);
	}
	sweepActorArray(this.objects);
	for (var i = 0; i < this.objects.length; i++) {
		this.objects[i].doLogic();
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
