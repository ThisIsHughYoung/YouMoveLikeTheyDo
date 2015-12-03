
function Mario(game) {
	Actor.call(this, game);
	
	// Hex: Player "Float State"
	// 0x00: On ground
	// 0x01: Airborn by jumping
	// 0x02: Airborn by walking off ledge
	// 0x03: Sliding down flagpole
	// See NES RAM Address 0x001D
	this.floatState = 0;
	
	// bool: track powerups
	this.isBig = false;
	this.isFire = false;
	this.isStarman = false;
	this.isInvuln = false;
	
	// array: starman palette colours
	this.starmanPalettes = [];
	
	// uint: timer for powerup animations
	this.starmanTimer = 0;
	this.starmanAnimCycle = 0;
	this.starmanAnimIndex = 0;
	this.powerupTimer = 0;
	this.powerupAnimCycle = 0;
	
	// uint: damage boost timer
	this.dbTimer = 0;
	
	// Set to true if we are "skidding"
	this.skid = false;
	
	this.crouch = false;
	
	// hex: Our "Input Direction", in binary.
	// Right: 00000001
	// Left:  00000010
	// L+R:   00000011
	this.idir = 0x01;
	
	// int: Same as dir, but storing direction of aerial momentum.
	this.momentumDir = 1;
	
	// uint: The current walkcycle sprite being displayed (0-2)
	this.walkcycleIndex = 0;
	// uint: The number of frames left before we cycle to the next
	// sprite in our walkcycle
	this.walkcycleFrame = 0;
	
	// bool: Set to "true" if running
	this.isRun = false;
	
	this.gravity = 0x280;
	this.gravityA = 0x280;
	
	// hex: Initial running speed at beginning of jump
	this.jumpInitialSpeed = 0;
	
	// hex: Player position (1 pixel = 0x10)
	this.x = 0x280;
	this.y = 0xC10;
	
	// hex: Max x-speed in air
	this.maxAirSpeed = 0x18FF;
	
	// hex: Player position relative to camera
	this.screenx = 0;
	
	// uint: number of frames since we released the B button
	this.framesSinceBReleased = 0;
	
	// CreateJS Spritesheet object
	this.spritesheetsmall = new createjs.SpriteSheet({
		images: [game.assets.loader.getResult("mario-s")],
		frames: {width:16,height:16,count:14*11,regX:0,regY:0},
		//animations: smallMarioAnim
	})
	
	this.spritesheetbig = new createjs.SpriteSheet({
		images: [game.assets.loader.getResult("mario-b")],
		frames: {width:16,height:32,count:14*11,regX:0,regY:0},
		//animations: smallMarioAnim // TODO: create array for large anims
	})
	
	// Mario's main sprite
	this.sprite = new createjs.Sprite(this.spritesheetsmall, 0);
	this.sprite.stop();
	
	// Set to 21 if big
	this.paletteSize = 14;
	
	// uint: Default palette colour to return to (0 for Mario, 1 for Luigi)
	this.defaultPalette = 0;
	
	// ----------------
	// END DECLARATIONS
	
	this.container.addChild(this.sprite);
	
	this.updateCoords();
	this.doGraphics();
	
}

Mario.prototype = Object.create(Actor.prototype);
Mario.prototype.constructor = Mario;

Mario.prototype.grow = function() {
	if (this.isBig) {
		return;
	}
	
	this.game.logicPause = true;
	this.game.timePause = true;
	
	this.game.eventAnim = 1;
	this.game.eventAnim2 = 0;
	this.game.eventAnimTimer = 0;
	
	playSound('snd-powerup');
}

Mario.prototype.shrink = function() {
	if (!this.isBig) {
		return;
	}
	
	this.game.logicPause = true;
	this.game.timePause = true;
	
	this.game.eventAnim = 3;
	this.game.eventAnim2 = 0;
	this.game.eventAnimTimer = 0;
	
	this.isInvuln = true;
	this.dbTimer = 148;
	
	playSound('snd-pipe');
}

Mario.prototype.useBigSprite = function() {
	if (this.isBig) {
		return;
	}
	
	this.isBig = true;
	
	this.container.removeChild(this.sprite);
	this.sprite = new createjs.Sprite(this.spritesheetbig,0);
	this.sprite.stop();
	this.container.addChild(this.sprite);
	this.height = 32;
	this.paletteSize = 21;
}

Mario.prototype.useSmallSprite = function() {
	if (!this.isBig) {
		return;
	}
	
	this.isBig = false;
	
	this.container.removeChild(this.sprite);
	this.sprite = new createjs.Sprite(this.spritesheetsmall,0);
	this.sprite.stop();
	this.container.addChild(this.sprite);
	this.height = 16;
	this.paletteSize = 14;
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

Mario.prototype.getHitbox = function() {
	// For some reason Mario's hitbox's left edge 1px off from what FCEUX displays
	return { x:((this.x - (this.x & 0xF)) / 0x10) + 3 + 1, 
		y:((this.y - (this.y & 0xF)) / 0x10) - (this.height-16) + 4, 
		w:9, 
		h:this.height-16 + 11};
}

Mario.prototype.drawHitbox = function(game) {
	var hBox = this.getHitbox();
	game.world.container.removeChild(this.hitbox);
	this.hitbox = new createjs.Shape();
	this.hitbox.graphics.setStrokeStyle(1,0,0,10,true).beginStroke("#0F0").drawRect(hBox.x - 1 + 0.5, hBox.y + 0.5, 10, 11);
	game.world.container.addChild(this.hitbox);
}

// The following functions are where all of the TAS magic has been
// implemented. The goal is to create a logical set of rules that,
// given the right inputs, will give us the same glitches that
// TAS-ers are known for, without introducing any of our own!
Mario.prototype.doCollision = function(game) {

	this.doBorderEjection(game);
	
	this.doGroundTest(game);
	
	this.doBumpEjection(game);
	this.doWallEjection(game);
	
	this.doGroundTest(game);
	
	this.doGroundEjection(game);
}

Mario.prototype.doGroundTest = function(game) {
	var hBox = this.getHitbox();
	this.collision.groundTest = false;
	if (Math.sign(this.ySpeed) >= 0) {
		var blCoord = [hBox.x, hBox.y + hBox.h];
		var brCoord = [hBox.x + hBox.w, hBox.y + hBox.h];
		
		var blTile = getTileAtPixel(blCoord);
		var brTile = getTileAtPixel(brCoord);
		
		var blBlock = game.world.getBlockAtTile(blTile);
		var brBlock = game.world.getBlockAtTile(brTile);
		
		if (blBlock.id == 1 || brBlock.id == 1) {
			if (blCoord[1] % 16 < 5) {
				this.collision.groundTest = true;
				this.ground = true;
			}
		}
	}
}

Mario.prototype.doGroundEjection = function(game) {
	if (!this.collision.groundTest && this.ground) {
		this.jumpInitialSpeed = Math.abs(this.speed);
		this.ground = false;
		if (this.jumpInitialSpeed < 0x1900) {
			this.maxAirSpeed = 0x18FF;
		} else {
			this.maxAirSpeed = 0x28FF
		}
		
		var f = this.frame;
		
		if (f < 1 || (f > 3 && f != 5)) {
			this.frame = 1;
		}
		
	}
	if (this.collision.groundTest) {
		this.y = (this.y & 0xFFF00) + 0x10;
	}
}

Mario.prototype.doWallEjection = function(game) {
	var hBox = this.getHitbox();
	this.collision.wallTest = false;
	
	var lCollision = false;
	var rCollision = false;
	
	var tlCoord = [hBox.x, hBox.y];
	var trCoord = [hBox.x + hBox.w, hBox.y];
	var blCoord = [hBox.x, hBox.y + hBox.h - 3];
	var brCoord = [hBox.x + hBox.w, hBox.y + hBox.h - 3];
	
	var tlTile = getTileAtPixel(tlCoord);
	var trTile = getTileAtPixel(trCoord);
	var blTile = getTileAtPixel(blCoord);
	var brTile = getTileAtPixel(brCoord);

	var tlBlock = game.world.getBlockAtTile(tlTile);
	var trBlock = game.world.getBlockAtTile(trTile);
	var blBlock = game.world.getBlockAtTile(blTile);
	var brBlock = game.world.getBlockAtTile(brTile);
	
	if (tlBlock.id == 1 || trBlock.id == 1) {
		this.collision.wallTest = true;
	}
	
	if (!this.ground && (blBlock.id == 1 || brBlock.id == 1)) {
		this.collision.wallTest = true;
	}
	
	if (this.collision.wallTest) {
		if (!this.ground) {
			if (blBlock.id == 1) {
				lCollision = true;
			}
			if (brBlock.id == 1) {
				rCollision = true;
			}
		}
		if (tlBlock.id == 1) {
			lCollision = true;
		}
		if (trBlock.id == 1) {
			rCollision = true;
		}
	
		// if falling: eject opp of momentum
		if (this.ySpeed > 0) {
			this.speed = 0;
			this.x += 0x10 * -this.momentumDir;
		} else {
			// if ascending or on ground, try to eject towards empty tile
			if (!lCollision && rCollision) {
				if (Math.sign(this.speed) != -1) {
					// Only eject if our velocity is
					// contrary to ejection
					this.speed = 0;
					this.x -= 0x10;
				}
			} else {
				if (Math.sign(this.speed) != 1) {
					this.speed = 0;
					this.x += 0x10;
				}
			}
		}
	}
}

Mario.prototype.doBumpEjection = function(game) {
	var hBox = this.getHitbox();
	var bumpCoord = [hBox.x + Math.floor(hBox.w/2), hBox.y]
	var bumpTile, bumpBlock;
	
	this.collision.bumpTest = false;
	
	if (this.ySpeed < 0) {
		bumpTile = getTileAtPixel(bumpCoord);
		bumpBlock = game.world.getBlockAtTile(bumpTile);
		if ((bumpBlock.id == 1 || bumpBlock.bump == true) && bumpCoord[1] % 0x10 > 0xA) {
			this.collision.bumpTest = true;
		}
	}
	
	if (this.collision.bumpTest) {
		this.y = (this.y & 0xFFFF00) + 0x100 - 0x20;
		this.ySpeed = this.gravity * 2;
		game.world.startBumpAnim(getTileAtPixel(bumpCoord));
		playSound('snd-bump');
	}
}

Mario.prototype.doBorderEjection = function(game) {
	var hBox = this.getHitbox();
	if (hBox.x < (game.world.camerax - (game.world.camerax & 0xF)) / 0x10) {
		this.x = game.world.camerax - 0x30;
		this.speed = 0;
	}
	/*if (hBox.x + hBox.w >= game.w ) {
		this.x = (game.w * 0x10) - 0xE0;
		this.speed = 0;
	}*/
}

Mario.prototype.beginStarman = function() {
	if (!this.alive) {
		// wut.
		return;
	}
	
	this.isStarman = true;
	this.starmanTimer = 735;
	this.starmanAnimCycle = 2;
	this.starmanAnimIndex = 0;
	changeBGM('bgm-starman',true);
}

Mario.prototype.doStarman = function() {
	this.starmanTimer--;
	if (this.starmanTimer <= 0) {
		this.isStarman = false;
		this.palette = this.defaultPalette;
	} else {
		this.starmanAnimCycle--;
		if (this.starmanTimer == 50) {
			// Nintendo polish: Audio cue for the player
			changeBGM(game.world.bgm, true);
		}
		if (this.starmanAnimCycle < 0) {
			
			if (this.starmanTimer >= 145) {
				this.starmanAnimCycle = 2;
			} else {
				// Nintendo polish: For the last 2.4 seconds or so,
				// Mario's colours cycle at 1/4 the normal rate so
				// the player can prepare to return to regular state.
				this.starmanAnimCycle = 8;
			}
			
			this.starmanAnimIndex++;
			if (this.starmanAnimIndex > 3) {
				this.starmanAnimIndex = 0;
			}
			// More Nintendo polish: Mario's colour cycles change
			// depending on the map palettes. I personally am not 100%
			// sure whether this is strictly a NES hardware limitation
			// but it sure looks visually more coherent.
			this.palette = this.starmanPalettes[this.starmanAnimIndex];
		}
	}
}

Mario.prototype.doLogic = function(game) {
	
	if (!this.alive) {
		// Ignore all logic (input, collisions) when dead
		this.updateCoords();
		this.doGraphics();
		return;
	}
	
	// Begin with powerup processing, etc.
	if (this.isStarman) {
		this.doStarman();
	}
	
	if (this.isInvuln) {
		if (this.dbTimer <= 0) {
			this.isInvuln = false;
			this.sprite.alpha = 1;
		}
		this.dbTimer--;
	}
	
	// Actual player logic
	
	if (this.ground) {
		if (game.input.isKeyDown['a']) {
			this.frame = 5;
			this.ground = false;
			this.jumpInitialSpeed = Math.abs(this.speed);
			this.ySpeed = (this.jumpInitialSpeed < 0x2500) ? -0x4000 : -0x5000;
			if (this.jumpInitialSpeed < 0x1000) {
				this.gravityA = 0x200;
				this.gravity = 0x700;
			} else if (this.jumpInitialSpeed < 0x2500) {
				this.gravityA = 0x1E0;
				this.gravity = 0x600;
			} else {
				this.gravityA = 0x280;
				this.gravity = 0x900;
			}
			this.ySpeed -= this.gravityA;
			if (this.jumpInitialSpeed < 0x1900) {
				this.maxAirSpeed = 0x18FF;
			} else {
				this.maxAirSpeed = 0x28FF
			}
			if (this.isBig) {
				playSound('snd-jump-super');
			} else {
				playSound('snd-jump-small');
			}
		}
	}
	
	if (this.ground) {
		this.ySpeed = 0;
		this.doGround(game)
	} else {
		this.doAir(game);
	}
	
	Actor.prototype.doLogic.call(this, game);
	
	if (this.screenystate >= 1 ) {
		this.die(game, true);
	}
	
}

// MARIO'S GROUND PHYSICS
// Logic for Mario's "ground state", handling the following:
// - Standing
// - Walking
// - Skidding
// - Turning around
// Note: If this function isn't NES-perfect, it's really damn close.
// Pressing Left+Right at the same time causes some quirks that
// lead to Mario "moonwalking" (SHAMONE!). Speedrunners and TAS'ers
// use these glitches to their advantage. This function recreates
// this behaviour correctly.
Mario.prototype.doGround = function(game) {
	var skidrate = marioDefaults.skidDecel;
	var accelrate = 0;
	var speedchange = 0;
	var isLeft = (game.input.kb['left']) ? true:false;
	var isRight = (game.input.kb['right']) ? true:false;
	var isInput = (isLeft || isRight) ? true : false;
	var horzMotion = (this.speed != 0) ? true : false;
	
	// set yspeed to 0
	this.ySpeed = 0;
	
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
	
	// Set acceleration rates and maximum speeds
	// according to whether we're running or walking
	if (this.isRun) {
		this.maxSpeed = marioDefaults.runMaxSpeed;
		accelrate = marioDefaults.runAccel;
	} else {
		this.maxSpeed = marioDefaults.walkMaxSpeed;
		accelrate = marioDefaults.walkAccel;
	}
	
	// The following variables exist to simulate
	// SMB moonwalking! (hee hee!)
	// (see declaration of Mario.idir for an explanation)
	// Left =  00000010
	// Right = 00000001
	var tempMDir = 0;
	if (this.speed > 0) {
		tempMDir = 1;
	} else {
		tempMDir = 2;
	}
	
	// Always set direction towards button press
	//
	// If button pressed, set inputdir to binary value:
	// Left:  00000010
	// Right: 00000001
	// But, when user inputs Left AND right, both bits are set!
	// L+R:   00000011
	// (in this state, Mario faces left, but moves right due to
	// a confusion in the game's code, which I have attempted to
	// recreate here.)
	// 
	// For more, see NES RAM Address 0x0003. Note that most emulators disable
	// Left + Right, Up + Down by default to simulate an actual d-pad.
	// You can re-enable this in FCEUX, but not in OpenEmu (Mac).
	if (isInput) {
		this.idir = 0;
		if (isLeft) {
			this.dir = -1;
			this.idir = this.idir | 2;
		}
		// If both L+R are pressed, Right takes precedence.
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
		// (This logic block will be triggered if both
		// Left+Right are pressed, hee heee heeeeee!)
		if (this.idir != tempMDir) {
			// Skidding Logic
			this.skid = true;
			
			// Set maxSpeed to walking
			// (Speedrunners use L+R to INSTANTLY slow Mario down
			// to walking, instead of having to wait for the
			// "10 frames rule")
			this.maxSpeed = marioDefaults.walkMaxSpeed;
			
			if (Math.abs(this.speed) > marioDefaults.skidTurnSpeed) {
				this.skid = true;
				speedchange = skidrate;
			} else {
				// If Mario's skidding speed is below a threshold,
				// Mario gets a foothold and begins walking normally
				// (Matches NES behaviour)
				this.speed = 0;
				speedchange = 0;
				this.skid = false;
			}
		} else {
			// Walking Logic
			this.skid = false;
			if (!isInput) {
				// If there's no input, slow mario down to a halt
				if (Math.abs(this.speed) > marioDefaults.releaseDecel) {
					this.speed += marioDefaults.releaseDecel * -(Math.sign(this.speed))
				} else {
					this.speed = 0;
					speedchange = 0;
				}
			} else {
				speedchange = accelrate;
			}
		}
		
		this.speed += speedchange * this.dir;
		
		// If we're pressing a button that matches our movement direction,
		// clamp Mario's movement speed down to his maximum
		// (Note that this isn't a proper skid check, as well as the
		// botched up logic in the following lines - this is why
		// Mario's moonwalk behaves the way that it does!)
		if (this.idir & tempMDir) {
			if (Math.sign(this.speed) == -1) {
				this.speed = Math.max(this.speed, -this.maxSpeed);
			} else {
				this.speed = Math.min(this.speed, this.maxSpeed);
			}
		}
	}
	
	if (this.speed == 0) {
   		// Standing Logic
		// (also triggered immediately after skidding to a halt)
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
		this.frame = 0;
	} else if (this.idir & tempMDir || Math.abs(this.speed) < marioDefaults.skidTurnSpeed) {
		// If a button we're pressing matches our direction,
		// play the "walk" animation. (Don't skid if our speed is within
		// the skid threshold)
		this.doWalkCycle();
	} else {
		this.frame = 4;
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
	
	if (this.frame < 1 || this.frame > 3) {
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
	
	// +1 because walkcycleIndex is zero-indexed but our first walking
	// frame is #1
	this.frame = this.walkcycleIndex + 1;
}

Mario.prototype.doAir = function(game) {
	// Match NES behaviour: only change the sprite if Mario
	// was standing (i.e. when level spawns Mario above ground)
	
	var gravityA;
	var gravity;
	var isLeft = (game.input.kb['left']) ? true:false;
	var isRight = (game.input.kb['right']) ? true:false;
	var isInput = (isLeft || isRight) ? true:false;
	
	// Air input direction - As usual, right takes precedence
	// in SMB's input scanning.
	var airidir = (isRight) ? 1 : -1;
	
	var tempidir;
	if (isInput) {
		tempidir = 0;
		if (isLeft) {
			tempidir = tempidir | 2;
		}
		if (isRight) {
			tempidir = tempidir | 1;
		}
	}
	var tempFDir = 0;
	if (this.dir == 1) {
		tempFDir = 1;
	} else if (this.dir == -1) {
		tempFDir = 2;
	}
	
	var momentumchange = 0;
	
	// Update Vertical Speed
	if (game.input.kb['a'] && this.ySpeed < 0) {
		this.ySpeed += this.gravityA;
	} else {
		this.ySpeed += this.gravity;
	}
	
	
	// Update Horizontal Speed
	// see jdaster64 for rules
	if (isInput) {
		if (Math.abs(this.speed) < 0x1900) {
			// Low speeds
			if (airidir == -Math.sign(this.speed) && this.jumpInitialSpeed >= 0x1D00) {
				// If we're reducing momentum after jumping from a running start,
				// give the player more control over momentum even at low speeds
				this.speed += 0x00D0 * airidir;
			} else {
				// In all other cases, player's ability to change momentum
				// at low speeds should be slightly reduced
				this.speed += 0x0098 * airidir;
				
				// TAS Trick: Hopping backwards of Mario's facing direction causes
				// Mario to accelerate 2x the normal rate (faster than running). 
				// No idea how this happened from a coding perspective. 
				// so I'll just leave this here.
				if (Math.sign(this.speed) == -this.dir && tempidir & ~tempFDir) {
					console.log("extra speed")
					this.speed += 0x0098 * airidir;	
				}
				
			}
		} else {
			// High speeds:
			// If the horizontal momentum is high, give the player more
			// control over it.
			this.speed += 0x00E4 * airidir;
		}
	}
	
	if (Math.abs(this.speed) > this.maxAirSpeed) {
		this.speed = this.maxAirSpeed * Math.sign(this.speed);
	}
	
	if (this.speed != 0) {
		this.momentumDir = Math.sign(this.speed);
	}
}

Mario.prototype.die = function(game, fall) {
	
	this.alive = false;
	
	// Stop all sound effects
	createjs.Sound.stop();
	
	changeBGM('bgm-die');
	
	// Set mario's sprite to "die", and make him jump
	if (fall == null) {
		game.eventAnim = 5;
		game.eventAnimTimer = 0;
		game.logicPause = true;
		this.speed = 0;
	}
}
