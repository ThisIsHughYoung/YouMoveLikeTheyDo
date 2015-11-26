var MarioWorld = function(game, level) {
	var map = level.chunks
	
	this.level = [];
	
	this.container = new createjs.Container();
	
	this.xtiles = 0;
	this.ytiles = 15;
	
	for (var chunk in map) {
		this.level.push([]);
		this.xtiles += 2;
		for (var column in map[chunk]) {
			this.level[chunk].push([]);
			for (var block in map[chunk][column]) {
				this.level[chunk][column].push({});
				switch (map[chunk][column][block]) {
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
						bitmap: new createjs.Bitmap(game.assets.loader.getResult('block'))
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
