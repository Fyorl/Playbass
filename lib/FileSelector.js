var ncurses = require('../deps/node_modules/ncurses');
var fs = require('fs');
var events = require('events');
var util = require('util');

function Selector () {
	ncurses.showCursor = true;
	ncurses.tabsize = 4;
	ncurses.echo = false;
	
	events.EventEmitter.call(this);
}

util.inherits(Selector, events.EventEmitter);

Selector.prototype.select = function (title, dir, win) {
	var self = this;
	var buffer = '';
	var file_list = [];
	var selection_start = -1;
	
	var print_selection_line = function () {
		win.cursor(file_list.length + 3, 0);
		win.clrtoeol();
		win.print('Selection: ');
		selection_start = win.curx;
	};
	
	var validate = function () {
		if (buffer.length < 1) {
			return;
		}
		
		buffer = parseInt(buffer);
		
		if (buffer < 1 || buffer > file_list.length) {
			buffer = '';
			print_selection_line();
			win.refresh();
			return;
		}
		
		win.removeListener('inputChar', getch);
		win.close();
		self.emit('selected', file_list[buffer - 1]);
	};
	
	var getch = function (ch, code) {
		if (
			(code < 48 || code > 57)
			&& code !== ncurses.keys.NEWLINE
			&& code !== ncurses.keys.BACKSPACE
		) {
			return;
		}
		
		if (code === ncurses.keys.BACKSPACE) {
			if (win.curx <= selection_start) {
				return;
			}
			
			buffer = buffer.substring(0, buffer.length - 1);
			win.cursor(win.cury, win.curx - 1);
			win.delch();
			return;
		}
		
		if (code === ncurses.keys.NEWLINE) {
			validate();
			return;
		}
		
		buffer += ch;
		win.print(ch);
		win.refresh();
	};
	
	win.clear();
	win.print(0, 0, title + ':');
	
	fs.readdir(dir, function (err, files) {
		if (err) {
			throw err;
		}
		
		file_list = files;
		win.on('inputChar', getch);
		
		for (var i = 0; i < files.length; i++) {
			var n = i + 1;
			var y = i + 2;
			win.print(y, 0, '\t' + n + ') ' + files[i]);
		}
		
		print_selection_line();
		win.refresh();
	});
};

exports.Selector = Selector;