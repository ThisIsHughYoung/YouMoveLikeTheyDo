function doEventAnims(game) {
	// An animation is happening (die, powerup, etc)
	switch(game.eventAnim) {
	case 1: // powerup
		game.doPowerupAnim();
		break;
	case 2: // fire powerup
	case 3: // powerdown
		game.doPowerdownAnim();
		break;
	case 4: // flagpole
	case 5: // die
		game.doDieAnim();
		break;
	default:
		game.eventAnimTimer = 0;
		game.eventAnim = 0;
		game.logicPause = false;
		break;
	}
}

// Event 1: Mario powers up (mushroom)
MarioGame.prototype.doPowerupAnim = function() {
	// Mario's sprite changes every four frames:
	// (nochange), (nochange), 2, 1, 2, 1, 2, 3, 1, 2, 3, 1
	// 1 = small standing, 2 = small with big head, 3 = big standing
	// The last cycle only lasts one frame, for a total of 145 frames
	
	// Speedrunner trick: Mario's state is inexplicably set to "ground"
	// during the mushroom animation. If Mario is in the air during the animation,
	// the player is NOT holding A before obtaining the mushroom, and then presses
	// A during the animation, Mario will jump in mid-air!
	this.mario.ground = true;
	if (this.eventAnimTimer % 4 == 0) {
		this.eventAnim2++;
		
		switch (this.eventAnim2) {
		case 0:
			// This should never happen
		case 1:
		case 2:
			// Do nothing
			break;
		case 4:
		case 6:
		case 9:
		case 12:
			// small standing
			this.mario.useSmallSprite();
			this.mario.frame = 0;
			break;
		case 3:
		case 5:
		case 7:
		case 10:
			//transition
			this.mario.useBigSprite();
			this.mario.frame = 15;
			break;
		case 8:
		case 11:
			this.mario.frame = 0;
			// big standing
		}
	}
	if (this.eventAnimTimer >= 45) {
		this.mario.useBigSprite();
		this.mario.frame = 0;
		this.eventAnimTimer = 0;
		this.eventAnim = 0;
		this.logicPause = false;
	}
	this.mario.doGraphics();
}

// Event 3: Powerdown (Big/Fire Mario takes damage)
MarioGame.prototype.doPowerdownAnim = function() {
	// 16 frames in big jumping sprite
	// 2 frames in small
	// then alternating 4 big, 4 small
	// Relinquish control on frame 56
	
	if (this.eventAnimTimer == 0) {
		this.mario.frame = 5;
	} else if (this.eventAnimTimer >= 18 && this.eventAnimTimer <= 55) {
		if ((this.eventAnimTimer - 2) % 4 == 0) {
			console.log("tick")
			if (this.mario.isBig) {
				this.mario.useSmallSprite();
				this.mario.frame = 9;
			} else {
				this.mario.useBigSprite();
				this.mario.frame = 10;
			}
		}
	} else if (this.eventAnimTimer > 55) {
		//relinquish control
		this.mario.useSmallSprite();
		this.mario.frame = 1;
		this.eventAnimTimer = 0;
		this.eventAnim = 0;
		this.logicPause = false;
	}
	this.mario.doGraphics();
}

// Event 5: Mario Dies
MarioGame.prototype.doDieAnim = function() {
	if (this.mario.isBig) {
		// Edge case, unrelated to actual game:
		// User uses "die" control while Mario is big
		this.mario.useSmallSprite();
	}
	
	this.mario.frame = 6;
	if (this.eventAnimTimer == 16) {
		this.mario.ySpeed = -0x4000;
	} else if (this.eventAnimTimer > 16) {
		this.mario.ySpeed += 0x280;
	}
	this.mario.updateCoords();
	this.mario.doGraphics();
	// Don't use eventAnimTimer to reset level.
	// (dieTimer handles this because this animation
	// does not play when Mario dies from falling)
}