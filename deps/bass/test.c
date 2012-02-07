#include <unistd.h>
#include <stdio.h>
#include "bass.h"

int main () {
	BASS_Init(-1, 44100, 0, 0, NULL);
	
	HSTREAM stream = BASS_StreamCreateFile(FALSE, "../../assets/songs/test.ogg", 0, 0, 0);
	printf("%d\n",BASS_ErrorGetCode());
	
	BASS_ChannelPlay(stream, TRUE);
	printf("%d\n", BASS_ErrorGetCode());
	
	while (TRUE) {
		usleep(100);
	}
	
	return 0;
}
