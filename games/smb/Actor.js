
function Actor(game) {
	this.game = game;
	
	this.alive = true;
	
	// Boolean: true if we're on the ground
	this.ground = true;
	
	// int: number of viewport heights
	// Above screen: > 0
	// On screen: 0
	// Below screen: < 0 (can fall as far as 5 screens down)
	this.screenystate = 0;
	
	this.x = 0;
	this.y = 0;
	
	// uint: Actor's height in pixels (either 16 or 32)
	this.height = 16;
	
	// int: The direction we are facing
	// 1 : right, -1: left
	this.dir = 1;
	
	// signed hex: Movement speeds (1 pixel = 0x1000)
	// Note that in speed calculations, we have one extra byte
	// of precision for acceleration, but this byte is not used
	// for calculating position.
	this.speed = 0;
	this.ySpeed = 0;
	
	// uint: The maximum speed at which a player can walk/run
	// (1 pixel = 0x1000)
	this.maxSpeed = 0x18FF;
	this.maxFallSpeed = 0x4000;
	
	this.collision = {
		groundTest: false,
		wallTest: false,
		wallTestUpper: false,
		bumpTest: false
	};
	
	this.paletteSize = 0;
	
	this.hitbox = new createjs.Shape();
	this.hitbox.graphics.setStrokeStyle(1,0,0,10,true).beginStroke("#0F0").drawRect(3.5, 3.5, 10, 12);
	this.showHitbox = false;
	
	// Container for all graphical objects
	this.container = new createjs.Container();
	
	// uint: Current frame of animation
	this.frame = 0;
	
	// uint: Current palette index (see spritesheet for reference)
	this.palette = 0;
}

Actor.prototype.updateCoords = function() {
	// Note: We don't always clamp x speed to maximum, for example, when skidding.
	// Relegate X-speed clamping to child
	this.ySpeed = Math.min(this.ySpeed, this.maxFallSpeed);
	
	this.x += (this.speed - (this.speed & 0xFF)) / 0x100;
	this.y += Math.abs(this.ySpeed - (this.ySpeed & 0xFF)) / 0x100 * Math.sign(this.ySpeed);
	
	this.screenystate = Math.floor((this.y - this.height*0x10)/0x1000);
}

Actor.prototype.doGraphics = function() {
	
	if (this.idir == null) {
		this.idir = this.dir;
	}
	
	if (this.idir & 2) {
		this.sprite.scaleX = -1;
	} else {
		this.sprite.scaleX = 1;
	}
	
	this.container.x = (this.x - (this.x & 0xF)) / 0x010;
	this.container.y = ((this.y - (this.y & 0xF)) / 0x010) - (this.height - 16);
	if (this.sprite.scaleX == -1) {
		this.sprite.x = 16;
	} else {
		this.sprite.x = 0;
	}
	
	if (this.sprite.currentFrame != (this.palette * this.paletteSize) + this.frame) {
		this.sprite.gotoAndStop((this.palette * this.paletteSize) + this.frame);
	}
}


Actor.prototype.doLogic = function(game) {
	this.updateCoords();
	
	this.doCollision(game);
	
	this.doGraphics();
}
