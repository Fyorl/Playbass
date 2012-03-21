#include <unistd.h>
#include <stdio.h>
#include "bass.h"

void print_intensities (float fft[], int len) {
	int i;
	
	for (i = 0; i < len; i++) {
		printf("%f ", fft[i]);
	}
	printf("\n");
}

int main () {
	if (!BASS_RecordInit(-1)) {
		printf("%d\n", BASS_ErrorGetCode());
		return 1;
	}
	
	HRECORD record = BASS_RecordStart(14000, 2, BASS_SAMPLE_8BITS, NULL, 0);
	if (!record) {
		printf("%d\n", BASS_ErrorGetCode());
		return 1;
	}
	
	DWORD bytes;
	float fft[512];
	
	while (TRUE) {
		BASS_ChannelGetData(record, fft, BASS_DATA_FFT1024);
		bytes = BASS_ChannelGetData(record, NULL, BASS_DATA_AVAILABLE);
		printf("%u\n", bytes);
		print_intensities(fft, 512);
		usleep(1000000);
	}
	
	return 0;
}
