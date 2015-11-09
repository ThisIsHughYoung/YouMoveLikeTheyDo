var KEYCODE_LEFT = 37,
	KEYCODE_RIGHT = 39,
	KEYCODE_UP = 38, 
	KEYCODE_DOWN = 40;
	
function init() {
	// Force Canvas to always use Nearest Neighbor scaling on
	// images (pixel art stays sharp)
	// Likely does not work on IE 9 or under
	var upscaledCanvas = $('#gameCanvas')[0].getContext('2d');
	upscaledCanvas.mozImageSmoothingEnabled = false;
	upscaledCanvas.webkitImageSmoothingEnabled = false;
	upscaledCanvas.msImageSmoothingEnabled = false;
	upscaledCanvas.imageSmoothingEnabled = false;
	
	// 
	this.document.onkeydown = gameKeyDown;
	this.document.onkeyup = gameKeyUp;
	
	loadAssets();
}

function loadAssets() {
	preload = new createjs.LoadQueue(false);
	preload.on("complete", gameBegin, this);
	preload.loadManifest(game.manifest);
}

// Input Scanning: see if the button event is related
// to any of our keybinds, in which case, store button
// state in the buffer	
function gameKeyDown(event) {
	for(var index in game.keybinds) { 
	    if (event.keyCode == game.keybinds[index]) {
	    	game.keybuffer[index] = true;
	    } 
	}
}
function gameKeyUp(event) {
	for(var index in game.keybinds) { 
	    if (event.keyCode == game.keybinds[index]) {
	    	game.keybuffer[index] = false;
	    } 
	}
}