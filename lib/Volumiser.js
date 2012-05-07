var BASS = require('../deps/node-bass/build/Release/bass');
var ncurses = require('../deps/node_modules/ncurses');
var events = require('events');
var util = require('util');

function Volumiser () {
	ncurses.showCursor = true;
	ncurses.tabsize = 4;
	ncurses.echo = false;

	events.EventEmitter.call(this);
}

util.inherits(Volumiser, events.EventEmitter);

Volumiser.prototype.init = function (win, record, TICK_INTERVAL, FACTOR) {
	var self = this;
	var state = 0;
	var threshold = 0;
	var max = 0;
	var buf = '';
	var time = null;
	var tickcount = 0;
	var note = 'SILENCE';

	var intro = function () {
		win.clear();
		win.print(0, 0, 'You need to calibrate your volume.\n\nIn the next screen you will see the level of the loudest note you have played so far. To reset this value, press R.\n\nIn the prompt, enter the minimum volume threshold you consider acceptable to trigger a note. Once satisfied, press ENTER. You will then be able to test whether a note is being detected or not based on your threshold. If you would like to set a different threshold at this point, press R, otherwise press ENTER again to proceed.\n\nPlease press ENTER now to proceed to calibration.');
	};

	var volume = function () {
		var vol = record.sample().volume;
		if (vol > max) {
			max = vol;
		}
		
		win.clear();
		win.print(0, 0, (max * FACTOR).toString());
		win.print(1, 0, 'Threshold: ' + buf);
		win.refresh();
		time = setTimeout(volume, TICK_INTERVAL);
	};

	var test = function () {
		if (tickcount > 2) {
			tickcount = 0;
			note = 'SILENCE';
		}

		if (record.sample().volume * FACTOR > threshold) {
			note = 'NOTE';
		}

		win.clear();
		win.print(0, 0, 'If you are satisfied that a note is detected every time you play, press ENTER. Otherwise press R and try a different threshold.');
		win.print(3, 0, note);
		win.refresh();

		tickcount++;
		time = setTimeout(test, TICK_INTERVAL);
	};
	
	var getch = function (ch, code) {
		if (ch === '\n' && state === 0) {
			if (!record.start()) {
				ncurses.cleanup();
				process.stderr.write('Unable to start recording: ' + BASS.error());
				process.exit(1);
			}
		}
		
		if (ch === 'r' || (ch === '\n' && state === 0)) {
			max = 0;
			clearTimeout(time);
			state = 1;
			volume();
			return;
		}

		if (ch === '\n' && state === 1) {
			state = 2;
			max = 0;
			threshold = parseInt(buf);
			if (isNaN(threshold) || !threshold) {
				threshold = 0;
			}
			clearTimeout(time);
			test();
			return;
		}

		if (ch === '\n' && state === 2) {
			clearTimeout(time);
			record.stop();
			win.removeListener('inputChar', getch);
			self.emit('done', threshold);
			return;
		}

		if (state === 1 && '0123456789'.indexOf(ch) > -1 && buf.length < 9) {
			buf += ch;
		}

		if (state === 1 && code === ncurses.keys.BACKSPACE && buf.length > 0) {
			buf = buf.substring(0, buf.length - 1);
		}
	};

	intro();
	win.on('inputChar', getch);
};

exports.Volumiser = Volumiser;