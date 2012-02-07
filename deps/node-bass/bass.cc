#define BUILDING_NODE_EXTENSION
#include <bass.h>
#include <node.h>

using namespace v8;

Handle<Value> bass_play (const Arguments& args) {
	HandleScope scope;
	
	Local<External> field = Local<External>::Cast(args.This()->GetInternalField(0));
	HSTREAM* stream = static_cast<HSTREAM*>(field->Value());
	BASS_ChannelPlay(*stream, FALSE);
	
	return scope.Close(Undefined());
}

Handle<Object> wrap_stream (HSTREAM* stream) {
	HandleScope scope;
	Handle<FunctionTemplate> tpl = FunctionTemplate::New();
	Handle<ObjectTemplate> obj_tpl = tpl->InstanceTemplate();
	obj_tpl->SetInternalFieldCount(1);
	
	tpl->PrototypeTemplate()->Set(
		String::NewSymbol("play")
		, FunctionTemplate::New(bass_play)->GetFunction()
	);
	
	Local<Object> obj = obj_tpl->NewInstance();
	obj->SetInternalField(0, External::New(stream));
	
	return scope.Close(obj);
}

Handle<Value> bass_init (const Arguments& args) {
	HandleScope scope;
	
	BASS_Init(-1, 44100, 0, 0, NULL);
	
	return scope.Close(Undefined());
}

Handle<Value> bass_stream_create_file (const Arguments& args) {
	HandleScope scope;
	
	if (args.Length() < 1) {
		ThrowException(Exception::TypeError(String::New("Wrong number of arguments.")));
		return scope.Close(Undefined());
	}
	
	if (!args[0]->IsString()) {
		ThrowException(Exception::TypeError(String::New("Function expects a filename string.")));
		return scope.Close(Undefined());
	}
	
	String::AsciiValue fname(args[0]);
	HSTREAM stream = BASS_StreamCreateFile(FALSE, (void *) *fname, 0, 0, 0);
	
	return wrap_stream(&stream);
}

void init (Handle<Object> target) {
	target->Set(
		String::NewSymbol("init")
		, FunctionTemplate::New(bass_init)->GetFunction()
	);
	
	target->Set(
		String::NewSymbol("load_file")
		, FunctionTemplate::New(bass_stream_create_file)->GetFunction()
	);
}

NODE_MODULE(bass, init)