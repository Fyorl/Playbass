var ncurses = require('../deps/node_modules/ncurses');
var BASS = require('../deps/node-bass/build/Release/bass');
var events = require('events');
var util = require('util');

function Tuner () {
	ncurses.showCursor = false;
	ncurses.tabsize = 4;
	ncurses.echo = false;
	
	events.EventEmitter.call(this);
}

util.inherits(Tuner, events.EventEmitter);

Tuner.prototype.init = function (win, TICK_INTERVAL, NOTES, FIFTH) {
	var self = this;
	var record;
	var window = [false, false, false];
	var widx = 0;
	var persist = 'X';
	self.interval = null;
	
	record = BASS.record_init();
	
	if (!record) {
		ncurses.cleanup();
		process.stderr.write('Unable to start recording: ' + BASS.error() + '\n');
		BASS.free();
		process.exit(1);
	}
	
	var check_note = function () {
		win.cursor(2, 0);
		win.clrtoeol();

		if (widx >= 2) {
			window[0] = window[1];
			window[1] = window[2];
			window[2] = false;
		}
		
		var samples = record.sample();
		
		for (var i = 0; i < samples.length; i++) {
			if (isNaN(samples[i])) {
				return;
			}

			if (samples[i] < 40 || samples[i] > 1550) {
				continue;
			}

			var prev = 'E';
			for (var freq in NOTES) {
				if (!NOTES.hasOwnProperty(freq)) {
					continue;
				}

				if (samples[i] < parseFloat(freq)) {
					if (!window[widx]) {
						window[widx] = {};
						window[widx][prev] = 1;
					} else {
						if (!window[widx][prev]) {
							window[widx][prev] = 1;
						} else {
							window[widx][prev]++;
						}
					}
					break;
				} else {
					prev = NOTES[freq];
				}
			}
		}

		if (widx < 2) {
			widx++;
		}

		var major = 'X';
		var fifth = 'X';
		var major_n = 0;
		var fifth_n = 0;
		var c;

		for (var i = 0; i < 3; i++) {
			if (!window[i]) {
				break;
			}
			
			for (var note in window[i]) {
				c = window[i][note];
				if (c > major_n) {
					if (major !== 'X') {
						fifth = major;
						fifth_n = major_n;
					}
					
					major = note;
					major_n = c;
				} else if (c > fifth_n) {
					fifth = note;
					fifth_n = c;
				}
			}
		}

		if (FIFTH[major] && FIFTH[major] === fifth) {
			persist = major;
		} else if (FIFTH[fifth] && FIFTH[fifth] === major) {
			persist = fifth;
		} else if (major !== 'X') {
			persist = major;
		}

		win.print(persist);
		win.refresh();
	};

	var getch = function (ch, code) {
		if (ch !== '\n') {
			return;
		}

		win.removeListener('inputChar', getch);
		clearInterval(self.interval);
		self.emit('tuned');
	}
	
	win.clear();
	win.print(0, 0, 'Please tune your guitar, when you are satisfied, hit ENTER:');
	win.on('inputChar', getch);
	
	self.interval = setInterval(check_note, TICK_INTERVAL);
};

exports.Tuner = Tuner;