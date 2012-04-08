#include <unistd.h>
#include <stdio.h>
#include <math.h>
#include "bass.h"

#define FREQ 14000

void print_intensities (float fft[], int len) {
	int i;//, n;
	float peaks[5] = {0};
	int peakids[5] = {0};
	
	for (i = 2; i < len - 1; i++) {
		//for (n = 0; n < 5; n++) {
			if (fft[i] > peaks[0]) {
				peaks[0] = fft[i];
				peakids[0] = i;
				//break;
			}
		//}
	}
	
	//for (n = 0; n < 5; n++) {
	//	peaks[0] = peakids[0] + 0.8721 * sin((fft[peakids[0]+1] - fft[peakids[0]-1]) / fft[peakids[0]] * 0.7632);
		peaks[0] = (double) peakids[0];
		printf("%f ", (peaks[0] * FREQ) / (len * 2));
	//}
	
	printf("\n");
}

int main () {
	if (!BASS_RecordInit(2)) {
		printf("%d\n", BASS_ErrorGetCode());
		return 1;
	}
	
	HRECORD record = BASS_RecordStart(FREQ, 1, BASS_SAMPLE_FLOAT, NULL, 0);
	if (!record) {
		printf("%d\n", BASS_ErrorGetCode());
		return 1;
	}
	
	//DWORD bytes;
	float fft[2048];
	
	while (TRUE) {
		BASS_ChannelGetData(record, fft, BASS_DATA_FFT4096);
		//bytes = BASS_ChannelGetData(record, NULL, BASS_DATA_AVAILABLE);
		//printf("%u\n", bytes);
		print_intensities(fft, 2048);
		usleep(500000);
	}
	
	return 0;
}
