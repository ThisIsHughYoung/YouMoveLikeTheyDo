var MarioWorld = function(game, level) {
	var map = level.chunks;
	var blockId = 0;
	var curBlock = null;
	
	this.level = [];
	
	this.container = new createjs.Container();
	this.container.y = -8;
	
	this.camerafixed = level.camerafixed;
	this.camerax = 0;
	
	this.palettes = level.palettes;
	
	this.xtiles = 0;
	this.ytiles = 15;
	
	for (var chunk in map) {
		this.level.push([]);
		this.xtiles += 2;
		for (var column in map[chunk]) {
			this.level[chunk].push([]);
			for (var block in map[chunk][column]) {
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
					this.container.addChild(curBlock.bitmap);
				}
				
			}
		}
	}
	
	this.width = this.level.length * 32;
	
	$("#gameOverlay").css('background-color', level.bgColor);
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

function setTileBitmap(world, block) {
	var tx = block.tx;
	var ty = block.ty;
	var coords = getTileCoords([tx, ty]);
	if (block.bitmap == null) {
		block.bitmap = new createjs.Sprite(
			game.assets.tilesets[block.tileset], 
			world.palettes[block.tileset - 1] + block.tile);
		block.bitmap.stop();
		block.bitmap.x = coords[0];
		block.bitmap.y = coords[1];
	} else {
		block.bitmap.gotoAndStop(world.palettes[block.tileset - 1] + block.tile);
	}
	world.level[Math.floor(tx/2)][tx%2][ty] = block;
}
