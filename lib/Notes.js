var Notes = function (record, NOTES, FIFTH) {
	var self = this;
	self.record = record;
	self.window = [false, false, false];
	self.widx = 0;
	self.persist = 'X';

	self.check = function () {
		if (self.widx >= 2) {
			self.window[0] = self.window[1];
			self.window[1] = self.window[2];
			self.window[2] = false;
		}
		
		var samples = self.record.sample();
		
		for (var i = 0; i < samples.length; i++) {
			if (isNaN(samples[i])) {
				return self.persist;
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
					if (!self.window[self.widx]) {
						self.window[self.widx] = {};
						self.window[self.widx][prev] = 1;
					} else {
						if (!self.window[self.widx][prev]) {
							self.window[self.widx][prev] = 1;
						} else {
							self.window[self.widx][prev]++;
						}
					}
					break;
				} else {
					prev = NOTES[freq];
				}
			}
		}
		
		if (self.widx < 2) {
			self.widx++;
		}
		
		var major = 'X';
		var fifth = 'X';
		var major_n = 0;
		var fifth_n = 0;
		var c;
		
		for (var i = 0; i < 3; i++) {
			if (!self.window[i]) {
				break;
			}
			
			for (var note in self.window[i]) {
				c = self.window[i][note];
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
			self.persist = major;
		} else if (FIFTH[fifth] && FIFTH[fifth] === major) {
			self.persist = fifth;
		} else if (major !== 'X') {
			self.persist = major;
		}

		return self.persist;
	};
};

exports.init = function (record, NOTES, FIFTH) {
	return new Notes(record, NOTES, FIFTH);
};