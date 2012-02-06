#define BUILDING_NODE_EXTENSION
#include <bass.h>
#include <node.h>

using namespace v8;

Handle<Value> bass_init (const Arguments& args) {
	HandleScope scope;
	
	BASS_Init(-1, 44100, 0, 0, NULL);
	
	return scope.Close(Undefined());
}

void init (Handle<Object> target) {
	target->Set(String::NewSymbol("init"), FunctionTemplate::New(bass_init)->GetFunction());
}

NODE_MODULE(bass, init)