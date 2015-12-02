var KEYCODE_LEFT = 37,
	KEYCODE_RIGHT = 39,
	KEYCODE_UP = 38, 
	KEYCODE_DOWN = 40;



// -----------------------------------------------------
// GameInput - a simple input abstraction layer
// Do not use this class on its own (should be nested inside Game)
var GameInput = function(n) {
	this.nkb = {};
	this.kb = {};
	this.pkb = {};
	
	this.isKeyDown = {};
	this.isKeyUp = {};
	
	this.keybinds = {}
	for (var i in n) {
		this.nkb[i] = false;
		this.kb[i] = false;
		this.pkb[i] = false;
		this.isKeyDown[i] = false;
		this.isKeyUp[i] = false;
		this.keybinds[i] = n[i];
	}
	
	var self = this;
	document.onkeydown = function(e) {self.gameKeyDown(e)};
	document.onkeyup = function(e) {self.gameKeyUp(e)};
}

GameInput.prototype.bindKey = function(n, kc) {
	this.keybinds[n] = kc;
	
	// Release the old key in case it was being held down
	this.nkb[n] = false;
}

GameInput.prototype.tick = function() {
	for (var i in this.kb) {
		this.pkb[i] = this.kb[i];
		this.kb[i] = this.nkb[i];
		
		this.isKeyDown[i] = this.kb[i] && !(this.pkb[i]);
		this.isKeyUp[i] = !(this.kb[i]) && this.pkb[i];
	}
}

// Input Scanning: see if the button event is related
// to any of our keybinds, in which case, store button
// state in the buffer
GameInput.prototype.gameKeyDown = function (event) {
	for(var index in this.keybinds) {
	    if (event.keyCode == this.keybinds[index]) {
	    	this.nkb[index] = true;
	    } 
	}
	if (event.keyCode == 80) {
		createjs.Ticker.paused = !createjs.Ticker.paused
	}
	if (event.keyCode == 84) {
		createjs.Ticker.dispatchEvent('tick')
	}
}
GameInput.prototype.gameKeyUp =  function (event) {
	for(var index in this.keybinds) {
	    if (event.keyCode == this.keybinds[index]) {
	    	this.nkb[index] = false;
	    } 
	}
}



// -----------------------------------------------
// Game class definition
// C-tor:
// title: Game Title
// w: width of game native resolution
// h: height
// inputs: an Object in the format of 
// { 'buttonName' : defaultkeycode, [...] }
var Game = function(title, w, h, inputs) {
	// Game Title
	this.title = title;
	
	this.debug = 1;
	
	// Game native resolution
	this.w = w;
	this.h = h;
	$('#gameCanvas').prop('width', w);
	$('#gameCanvas').prop('height', h);
	$('#gameOverlay').prop('width', w);
	$('#gameOverlay').prop('height', h);
	
	this.input = new GameInput(inputs);
	
	this.audio = {};
	this.audio.playing = false;
	
	this.assets = {};
	
	this.stage = new createjs.Stage("gameCanvas");
	/*this.stage.canvas.width = w;
	this.stage.canvas.width = h;*/
	
	this.overlay = {
		stage: new createjs.Stage("gameOverlay"),
		buffer: new createjs.Bitmap($('#gameCanvas')[0]),
		scale: 1
	}

	this.overlay.stage.addChild(this.overlay.buffer);
	
	
	forceNearestNeighbor($('#gameOverlay'));
	
	// Abstract functions
	this.begin = function(game) {}
	this.tick = function(game) {}
}

Game.prototype.loadManifest = function(m, options) {
	if (window.location.protocol == 'file:') {
		this.assets.loader = new createjs.LoadQueue(false);
	} else {
		this.assets.loader = new createjs.LoadQueue();
	}
	
	if (options != null && options.audio == true) {
		this.assets.loader.installPlugin(createjs.Sound);
	}
	
	if (this.debug >= 1) {
		this.assets.loader.on("fileload", function(event){
			console.log("Loaded: " + event.item.id + " (" + event.item.src + ")");
		}, this)
	}
	this.assets.loader.on("complete", this.loadComplete, this);
	this.assets.loader.loadManifest(manifest);
};

Game.prototype.loadComplete = function() {

	if (this.debug >= 1) {
		console.log("All assets loaded, let's-a-go!")
	}
	this.begin(this);
	
	createjs.Ticker.setFPS(60);
	createjs.Ticker.addEventListener("tick", this.tick);
};

Game.prototype.resizeFrame = function(scale) {;
	this.overlay.scale = scale;
	this.overlay.buffer.scaleX=scale;
	this.overlay.buffer.scaleY=scale;
	$('#gameOverlay').prop('width', (this.w * scale));
	$('#gameOverlay').prop('height', (this.h * scale));
	forceNearestNeighbor($('#gameOverlay'));
}

// Force Canvas to always use Nearest Neighbor scaling on
// images (pixel art stays sharp)
// Likely does not work on IE 9 or under
function forceNearestNeighbor(canvas) {
	var upscaledCanvas = canvas[0].getContext('2d');
	upscaledCanvas.mozImageSmoothingEnabled = false;
	upscaledCanvas.webkitImageSmoothingEnabled = false;
	upscaledCanvas.msImageSmoothingEnabled = false;
	upscaledCanvas.imageSmoothingEnabled = false;
}