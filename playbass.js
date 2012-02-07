// C bindings
var BASS = require('./deps/node-bass/build/Release/bass');
var ncurses = require('./deps/node_modules/ncurses');

// Native javascript libraries
var FileSelector = require('./lib/FileSelector.js');
var TabWriter = require('./lib/TabWriter.js');

// Node libraries
var util = require('util');

var TICK_INTERVAL = 50;
var current_tick = 0;

process.on('uncaughtException', function (err) {
	ncurses.cleanup();
	console.log(err.stack, err.message);
	throw err;
});

process.on('SIGINT', function () {
	ncurses.cleanup();
	process.exit(0);
});

function main () {
	var stdwin = new ncurses.Window();
	var selector = new FileSelector.Selector();
	var stream;
	var tab = null;
	var interval = null;
	
	BASS.init();
	
	var main_loop = function () {
		tab.write(current_tick, TICK_INTERVAL);
		current_tick++;
	};
	
	selector.on('selected', function (fname) {
		stream = BASS.load_file(fname);
		tab = new TabWriter.Writer(stdwin);
		
		tab.on('initialised', function () {
			stream.play();
			main_loop();
			interval = setInterval(main_loop, TICK_INTERVAL);
		});
		
		tab.initialise(
			fname.substring(0, fname.lastIndexOf('.'))
			, TICK_INTERVAL
		);
	});
	
	selector.select('Choose a song', 'assets/songs', stdwin);
}

main();