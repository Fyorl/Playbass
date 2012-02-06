var BASS = require('./deps/node-bass/build/Release/bass');
var FileSelector = require('./lib/FileSelector.js');
var ncurses = require('./deps/node_modules/ncurses');

process.on('uncaughtException', function (err) {
	ncurses.cleanup();
	console.log(err);
	throw err;
});

function main () {
	var stdwin = new ncurses.Window();
	var selector = new FileSelector.Selector();
	
	selector.on('selected', function (fname) {
		stdwin.close();
		console.log(fname);
	});
	
	selector.select('Choose a song', 'assets/songs', stdwin);
}

main();