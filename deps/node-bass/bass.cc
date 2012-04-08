#define BUILDING_NODE_EXTENSION
#include <bass.h>
#include <node.h>
#include <math.h>
#include <string.h>

#define FREQ 14000

using namespace v8;

Handle<Value> bass_stream_pause (const Arguments& args) {
	HandleScope scope;
	
	DWORD stream = args.This()->GetInternalField(0)->Uint32Value();
	BASS_ChannelPause(stream);
	
	return scope.Close(Undefined());
}

Handle<Value> bass_stream_play (const Arguments& args) {
	HandleScope scope;
	
	DWORD stream = args.This()->GetInternalField(0)->Uint32Value();
	BASS_ChannelPlay(stream, FALSE);
	
	return scope.Close(Undefined());
}

Handle<Value> bass_stream_stop (const Arguments& args) {
	HandleScope scope;
	
	DWORD stream = args.This()->GetInternalField(0)->Uint32Value();
	BASS_ChannelStop(stream);
	
	return scope.Close(Undefined());
}

Handle<Value> bass_stream_sync (const Arguments& args) {
	HandleScope scope;
	
	double ms = args[0]->NumberValue();
	DWORD stream = args.This()->GetInternalField(0)->Uint32Value();
	QWORD bytes = BASS_ChannelSeconds2Bytes(stream, ms / 1000);
	BASS_ChannelSetPosition(stream, bytes, BASS_POS_BYTE);
	
	return scope.Close(Undefined());
}

Handle<Value> bass_stream_time (const Arguments& args) {
	HandleScope scope;
	
	DWORD stream = args.This()->GetInternalField(0)->Uint32Value();
	QWORD bytes = BASS_ChannelGetPosition(stream, BASS_POS_BYTE);
	double secs = BASS_ChannelBytes2Seconds(stream, bytes);
	
	return scope.Close(Number::New(secs));
}

Handle<Value> bass_record_start (const Arguments& args) {
	HandleScope scope;
	
	HRECORD record = args.This()->GetInternalField(0)->Uint32Value();
	if(!BASS_ChannelPlay(record, TRUE)) {
		return scope.Close(Boolean::New(FALSE));
	}
	
	return scope.Close(Boolean::New(TRUE));
}

Handle<Value> bass_record_stop (const Arguments& args) {
	HandleScope scope;
	
	HRECORD record = args.This()->GetInternalField(0)->Uint32Value();
	if(!BASS_ChannelStop(record)) {
		return scope.Close(Boolean::New(FALSE));
	}
	
	return scope.Close(Boolean::New(TRUE));
}

Handle<Value> bass_record_sample (const Arguments& args) {
	HandleScope scope;
	HRECORD record = args.This()->GetInternalField(0)->Uint32Value();
	
	float fft[4096];
	double peaks[5] = {0};
	double tmp[5] = {0};
	int peaki[5] = {0};
	int i, n, k;
	
	BASS_ChannelGetData(record, fft, BASS_DATA_FFT8192);
	
	for (i = 2; i < 4095; i++) {
		for (n = 0; n < 5; n++) {
			if (fft[i] > peaks[n]) {
				memmove(tmp, peaks, 5 * sizeof(double));
				for (k = n + 1; k < 5; k++) {
					peaks[k] = tmp[k-1];
				}
				
				peaks[n] = (double) fft[i];
				peaki[n] = i;
				break;
			}
		}
	}
	
	Local<Array> ret = Array::New(5);
	
	for (n = 0; n < 5; n++) {
		peaks[n] = peaki[n] + 0.8721 * sin((fft[peaki[n]+1] - fft[peaki[n]-1]) / fft[peaki[n]] * 0.7632);
		ret->Set(n, Number::New((peaks[n] * FREQ) / 8192));
	}
	
	return scope.Close(ret);
}

Handle<Object> wrap_record (HRECORD record) {
	HandleScope scope;
	Handle<FunctionTemplate> tpl = FunctionTemplate::New();
	Handle<ObjectTemplate> obj_tpl = tpl->InstanceTemplate();
	obj_tpl->SetInternalFieldCount(1);
	
	Local<Object> obj = obj_tpl->NewInstance();
	obj->SetInternalField(0, Uint32::New(record));
	
	obj->Set(
		String::NewSymbol("start")
		, FunctionTemplate::New(bass_record_start)->GetFunction()
	);
	
	obj->Set(
		String::NewSymbol("stop")
		, FunctionTemplate::New(bass_record_stop)->GetFunction()
	);
	
	obj->Set(
		String::NewSymbol("sample")
		, FunctionTemplate::New(bass_record_sample)->GetFunction()
	);
	
	return scope.Close(obj);
}

Handle<Object> wrap_stream (HSTREAM stream) {
	HandleScope scope;
	Handle<FunctionTemplate> tpl = FunctionTemplate::New();
	Handle<ObjectTemplate> obj_tpl = tpl->InstanceTemplate();
	obj_tpl->SetInternalFieldCount(1);
	
	Local<Object> obj = obj_tpl->NewInstance();
	obj->SetInternalField(0, Uint32::New(stream));
	
	obj->Set(
		String::NewSymbol("play")
		, FunctionTemplate::New(bass_stream_play)->GetFunction()
	);
	
	obj->Set(
		String::NewSymbol("pause")
		, FunctionTemplate::New(bass_stream_pause)->GetFunction()
	);
	
	obj->Set(
		String::NewSymbol("stop")
		, FunctionTemplate::New(bass_stream_stop)->GetFunction()
	);
	
	obj->Set(
		String::NewSymbol("time")
		, FunctionTemplate::New(bass_stream_time)->GetFunction()
	);
	
	obj->Set(
		String::NewSymbol("sync")
		, FunctionTemplate::New(bass_stream_sync)->GetFunction()
	);
	
	return scope.Close(obj);
}

Handle<Value> bass_init (const Arguments& args) {
	HandleScope scope;
	
	BASS_Init(-1, 44100, 0, 0, NULL);
	
	return scope.Close(Undefined());
}

Handle<Value> bass_free (const Arguments& args) {
	HandleScope scope;
	
	BASS_Free();
	
	return scope.Close(Undefined());
}

Handle<Value> bass_error (const Arguments& args) {
	HandleScope scope;
	
	int err = BASS_ErrorGetCode();
	
	return scope.Close(Integer::New(err));
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
	
	return wrap_stream(stream);
}

Handle<Value> bass_record_init (const Arguments& args) {
	HandleScope scope;
	
	if (!BASS_RecordInit(1)) {
		return scope.Close(Boolean::New(FALSE));
	}
	
	HRECORD record = BASS_RecordStart(FREQ, 1, BASS_SAMPLE_FLOAT, NULL, 0);
	if (!record) {
		return scope.Close(Boolean::New(FALSE));
	}
	
	/*if(!BASS_ChannelStop(record)) {
		return scope.Close(Boolean::New(FALSE));
	}*/
	
	return wrap_record(record);
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
	
	target->Set(
		String::NewSymbol("free")
		, FunctionTemplate::New(bass_free)->GetFunction()
	);
	
	target->Set(
		String::NewSymbol("error")
		, FunctionTemplate::New(bass_error)->GetFunction()
	);
	
	target->Set(
		String::NewSymbol("record_init")
		, FunctionTemplate::New(bass_record_init)->GetFunction()
	);
}

NODE_MODULE(bass, init)