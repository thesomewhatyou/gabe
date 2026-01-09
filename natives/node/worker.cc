#include "worker.h"
#include "../common.h"

using namespace std;

ImageAsyncWorker::ImageAsyncWorker(Napi::Env &env, Promise::Deferred deferred, string command, ArgumentMap inArgs,
                                   string type, const char *bufData, size_t bufSize)
    : AsyncWorker(env), deferred(deferred), command(command), inArgs(inArgs), type(type), bufData(bufData),
      bufSize(bufSize) {}

void ImageAsyncWorker::Execute() {
  outType = GetArgumentWithFallback<bool>(inArgs, "togif", false) ? "gif" : type;
  shouldKill = false;

  if (bufSize != 0) {
    outArgs = FunctionMap.at(command)(type, outType, bufData, bufSize, inArgs, &shouldKill);
  } else {
    outArgs = NoInputFunctionMap.at(command)(type, outType, inArgs, &shouldKill);
  }
}

void ImageAsyncWorker::OnError(const Error &e) {
  std::string detail = vips_error_buffer();
  vips_error_clear();
  vips_thread_shutdown();
  if (shouldKill) {
    deferred.Reject(Napi::Error::New(Env(), "image_job_killed").Value());
  } else {
    Napi::Error err = Napi::Error::New(Env(), e.Message());
    Napi::Object errObj = err.Value();
    if (!detail.empty()) {
      errObj.Set("detail", Napi::String::New(Env(), detail));
    }
    deferred.Reject(errObj);
  }
}

void ImageAsyncWorker::OnOK() {
  vips_error_clear();
  vips_thread_shutdown();

  if (MapContainsKey(outArgs, "error")) {
    string err = GetArgument<string>(outArgs, "error");
    deferred.Reject(Napi::Error::New(Env(), err).Value());
    return;
  }

  Buffer nodeBuf = Buffer<char>::New(Env(), 0);
  size_t outSize = GetArgumentWithFallback<size_t>(outArgs, "size", 0);
  if (outSize > 0) {
    char *buf = GetArgument<char *>(outArgs, "buf");
    nodeBuf = Buffer<char>::Copy(Env(), buf, outSize);
    g_free(buf);
  }

  Napi::Object returned = Napi::Object::New(Env());
  returned.Set("data", nodeBuf);
  returned.Set("type", Napi::String::New(Env(), outType));
  deferred.Resolve(returned);
}
