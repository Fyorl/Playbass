// C bindings
var BASS = require('./deps/node-bass/build/Release/bass');
var ncurses = require('./deps/node_modules/ncurses');

// Native javascript libraries
var FileSelector = require('./lib/FileSelector.js');
var TabWriter = require('./lib/TabWriter.js');
var Tuner = require('./lib/Tuner.js');

// Node libraries
var util = require('util');
var fs = require('fs');

var TICK_INTERVAL = 50;
var FFW_INTERVAL = 1000;
var current_tick = 0;

var NOTES = JSON.parse(fs.readFileSync('assets/notes.json', 'utf8'));
var FIFTH = JSON.parse(fs.readFileSync('assets/fifths.json', 'utf8'));

process.on('uncaughtException', function (err) {
	ncurses.cleanup();
	console.log(err.stack, err.message);
	throw err;
});

process.on('SIGINT', function () {
	ncurses.cleanup();
	BASS.free();
	process.exit(0);
});

function ms_to_time (ms) {
	var s = Math.floor(ms / 1000);
	ms -= s * 1000;
	var m = Math.floor(s / 60);
	s -= m * 60;
	
	if (m < 10) m = '0' + m;
	if (s < 10) s = '0' + s;
	if (ms < 10) ms = '00' + ms;
	else if (ms < 100) ms = '0' + ms;
	
	ms = ms.toString();
	return m + ':' + s + ':' + ((ms.indexOf('.') > -1) ? ms.substring(0, ms.indexOf('.')) : ms);
}

function main () {
	var stdwin = new ncurses.Window();
	var selector = new FileSelector.Selector();
	var tuner = new Tuner.Tuner();
	var stream;
	var tab = null;
	var interval = null;
	var state = 0;
	
	BASS.init();
	
	var pause = function () {
		// Decrease the tick by 1 for syncing purposes
		state = 0;
		stream.pause();
		clearInterval(interval);
	};
	
	var play = function () {
		if (current_tick > 0) {
			current_tick--;
		}
		
		state = 1;
		stream.sync(current_tick * TICK_INTERVAL);
		stream.play();
		main_loop();
		interval = setInterval(main_loop, TICK_INTERVAL);
	};
	
	var quit = function () {
		ncurses.cleanup();
		BASS.free();
		process.exit(0);
	};
	
	var jump = function (ms) {
		pause();
		current_tick += (ms / TICK_INTERVAL);
		
		if (current_tick < 0) {
			current_tick = 0;
		}
		
		stream.sync(current_tick * TICK_INTERVAL);
		tab.reset(current_tick, TICK_INTERVAL);
		update_times();
	};
	
	var key_handler = function (ch, code) {
		switch (code) {
			case ncurses.keys.SPACE:
				if (!state) {
					play();
				} else {
					pause();
				}
			break;
			
			case ncurses.keys.ESC:
				quit();
			break;
			
			case ncurses.keys.LEFT:
				jump(-FFW_INTERVAL);
			break;
			
			case ncurses.keys.RIGHT:
				jump(FFW_INTERVAL);
			break;
			
			case ncurses.keys.UP:
				jump(FFW_INTERVAL * 5);
			break;
			
			case ncurses.keys.DOWN:
				jump(FFW_INTERVAL * 5 * -1);
			break;
		}
		
		switch (ch.toLowerCase()) {
			case 'r':
				jump(-1 * (current_tick * TICK_INTERVAL));
			break;
		}
	};
	
	var update_times = function () {
		stdwin.print(6, 0, ' tick time: ' + ms_to_time(current_tick * TICK_INTERVAL));
		stdwin.print(7, 0, ' BASS time: ' + ms_to_time(stream.time() * 1000));
		stdwin.refresh();
	};
	
	var main_loop = function () {
		tab.write(current_tick, TICK_INTERVAL);
		current_tick++;
		update_times();
	};
	
	selector.on('selected', function (fname) {
		stream = BASS.load_file('assets/songs/' + fname);
		tab = new TabWriter.Writer(stdwin);
		
		tab.on('initialised', function () {
			stdwin.on('inputChar', key_handler);
		});
		
		tab.initialise(
			fname.substring(0, fname.lastIndexOf('.'))
			, TICK_INTERVAL
		);
	});
	
	tuner.on('tuned', function () {
		selector.select('Choose a song', 'assets/songs', stdwin);
	});
	
	tuner.init(stdwin, TICK_INTERVAL, NOTES, FIFTH);
}

main();