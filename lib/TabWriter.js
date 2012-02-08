var ncurses = require('../deps/node_modules/ncurses');
var events = require('events');
var util = require('util');
var fs = require('fs');

function Tab (data, TUNING) {
	var self = this;
	self.buckets = {};
	self.notes = {};
	self.start = {};
	self.end = {};
	
	data.split('\n').forEach(function (line) {
		var chunks = line.split('\t');
		var ms = parseInt(chunks[0]);
		var string = chunks[1];
		var fret = parseInt(chunks[2]);
		
		if (!self.buckets[string]) {
			self.buckets[string] = [];
		}
		
		if (!self.notes[string]) {
			self.notes[string] = {};
		}
		
		self.buckets[string].push(ms);
		self.notes[string][ms] = fret;
	});
	
	TUNING.forEach(function (string) {
		if (!self.buckets[string]) {
			return;
		}
		
		self.start[string] = 0;
		self.end[string] = self.buckets[string].length;
		
		// Rather than assume the tab is sorted numerically, we sort it here.
		// Javascript's default sort is bubble sort which is less than optimal
		// however, since this is just an initialisation, it hardly matters.
		self.buckets[string].sort(function (a, b) {
			return a - b;
		});
	});
};

function Writer (win) {
	this.win = win;
	this.tab = {};
	this.TUNING = ['G', 'D', 'A', 'E'];
	this.HEAD = ' % --';
	
	ncurses.showCursor = false;
	ncurses.echo = false;
	
	events.EventEmitter.call(this);
}

util.inherits(Writer, events.EventEmitter);

Writer.prototype.initialise = function (fname, TICK_INTERVAL) {
	var self = this;
	self.win.clear();
	
	fs.readFile(
		'assets/tabs/' + fname + '.tab'
		, 'utf8'
		, function (err, data) {
		if (err) {
			throw err;
		}
		
		self.tab = new Tab(data, self.TUNING);
		self.write(0, TICK_INTERVAL);
		self.emit('initialised');
	});
};

Writer.prototype.reset = function (tick, TICK_INTERVAL) {
	var self = this;
	['start', 'end'].forEach(function (prop, i) {
		for (string in self.tab[prop]) {
			if (!self.tab[prop].hasOwnProperty(string)) {
				continue;
			}
			
			self.tab[prop][string] = 0;
			if (prop === 'end') {
				self.tab[prop][string] = self.tab.buckets[string].length;
			}
		}
	});
	
	self.write(tick, TICK_INTERVAL);
}

Writer.prototype.write = function (tick, TICK_INTERVAL) {
	var self = this;
	
	self.TUNING.forEach(function (note, i) {
		self.write_line(note, i, tick, TICK_INTERVAL);
	});
	
	self.win.refresh();
};

Writer.prototype.write_line = function (note, row, tick, TICK_INTERVAL) {
	var self = this;
	var lower = tick * TICK_INTERVAL;
	var upper = TICK_INTERVAL * (ncurses.cols - self.HEAD.length);
	var line = Array(ncurses.cols - self.HEAD.length);
	
	if (self.tab.buckets[note]) {
		while (self.tab.buckets[note][self.tab.start[note]] < lower) {
			self.tab.start[note]++;
			
			if (!self.tab.start[note] >= self.tab.buckets[note].length) {
				return;
			}
		}
		
		while (self.tab.buckets[note][self.tab.end[note]] > upper) {
			self.tab.end[note]--;
			
			if (self.tab.end[note] < 0) {
				self.tab.end[note] = 0;
				break;
			}
			
			if (self.tab.end[note] <= self.tab.start[note]) {
				break;
			}
		}
		
		for (var i = self.tab.start[note]; i <= self.tab.end[note]; i++) {
			var ms = self.tab.buckets[note][i];
			var pos = Math.floor((ms - lower) / TICK_INTERVAL);
			var fret = self.tab.notes[note][ms];
			line[pos] = fret;
			
			if (fret > 9) {
				line[pos] = Math.floor(fret / 10);
				line[pos + 1] = fret - line[pos] * 10;
			}
		}
	}
	
	self.win.print(row, 0, self.HEAD.replace('%', note));
	for (var i = 0; i < line.length; i++) {
		var ch = '-';
		
		if (i === 0 || i === line.length - 1) {
			ch = '|';
		}
		
		if (line[i] !== undefined) {
			ch = line[i].toString();
		}
		
		self.win.print(row, i + self.HEAD.length, ch);
	}
};

exports.Writer = Writer;