var ncurses = require('../deps/node_modules/ncurses');
var BASS = require('../deps/node-bass/build/Release/bass');
var Notes = require('./Notes.js');
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
	var notes = Notes.init(record, NOTES, FIFTH);
	
	if (!record) {
		ncurses.cleanup();
		process.stderr.write('Unable to start recording: ' + BASS.error() + '\n');
		BASS.free();
		process.exit(1);
	}
	
	var check_note = function () {
		win.cursor(2, 0);
		win.clrtoeol();
		win.print(notes.check());
		win.refresh();
	};

	var getch = function (ch, code) {
		if (ch !== '\n') {
			return;
		}

		win.removeListener('inputChar', getch);
		clearInterval(self.interval);
		
		if (!record.stop()) {
			ncurses.cleanup();
			process.stderr.write('Unable to stop recording: ' + BASS.error());
			process.exit(1);
		}
		
		self.emit('tuned', record);
	}
	
	win.clear();
	win.print(0, 0, 'Please tune your guitar, when you are satisfied, hit ENTER:');
	win.on('inputChar', getch);
	
	self.interval = setInterval(check_note, TICK_INTERVAL);
};

exports.Tuner = Tuner;