// Copyright (c) 2019 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import {XVIZFormat, XVIZFormatWriter} from '@xviz/io';

export class WebsocketSink {
  constructor(socket, options) {
    this.socket = socket;
    this.options = options;
  }

  writeSync(name, data) {
    let {compress = false} = this.options;
    if (typeof data === 'string') {
      compress = true;
    }

    this.socket.send(data, {compress});
  }
}

// Send message through the websocket taking into account
// that only string and arraybuffer data can be sent.
//
// Only stateUpdates are sent as binary, everything else
// is assumed to just be JSON strings (generally short ones).
export class XVIZWebsocketSender {
  constructor(context, socket, options = {}) {
    this.context = context;
    this.socket = socket;
    this.sink = new WebsocketSink(socket, options);

    // TODO: options register:
    // - compress
    // - formatter

    this.options = options;
    this.defaultFormat = options.socketFormatPreference || XVIZFormat.binary;

    // This is the actual format we use to send data and can change
    // based on the message.
    this.format = options.format;

    if (this.format === XVIZFormat.object) {
      throw new Error(
        `Cannot send XVIZ format ${
          this.format
        } through a websocket. The data must be a string or array.`
      );
    }

    this.writer = null;
  }

  // Sets this.writer based on 'format'
  _syncFormatWithWriter(format) {
    // Cover the case where we have a format and no writer or when the
    // format does not match.

    if (!this.writer || this.format !== format) {
      this.writer = new XVIZFormatWriter(this.sink, {format});
      this.format = format;
    }
  }

  // Data is in the desired format and can be written to sink directly
  _sendDataDirect(msg) {
    const {format} = this.options;
    const sourceFormat = msg.data.dataFormat();

    // If format is not set, we want to send as is if we can (no processing)
    // but if it is an object, we must format it for sending over the socket
    if ((!format || sourceFormat === format) && sourceFormat !== XVIZFormat.object) {
      // need to check if object() has been called (ie it might be dirty) and repack
      if (!msg.data.hasMessage()) {
        return true;
      }
    }

    return false;
  }

  _getFormatOptions(msg) {
    // default should be pass-thru of original data
    if (!this.format) {
      // If no format is specified, we need to ensure we send a
      // string or arraybuffer through the websocket

      // Test to determine if msg is either string or arraybuffer
      if (
        msg.data.dataFormat() === XVIZFormat.object ||
        (!msg.data.hasMessage() &&
          typeof msg.data.buffer !== 'string' &&
          !msg.data.buffer.byteLength)
      ) {
        return {...this.options, format: this.defaultFormat};
      }

      // return the format set to the current data format
      return {...this.options, format: msg.data.dataFormat()};
    }

    return {format: this.format};
  }

  onError(req, msg) {
    // TODO: This message is almost always just a plain object
    // but the special handling for here feels awkard
    const resp = JSON.stringify(msg.data.buffer);
    this.sink.writeSync('error', resp);
  }

  onMetadata(req, msg) {
    const {format} = this._getFormatOptions(msg);

    if (this._sendDataDirect(msg)) {
      this.sink.writeSync(`1-frame`, msg.data.buffer);
    } else {
      this._syncFormatWithWriter(format);
      this.writer.writeMetadata(msg.data);
    }
  }

  onStateUpdate(req, msg) {
    const {format} = this._getFormatOptions(msg);

    if (this._sendDataDirect(msg)) {
      this.sink.writeSync('2-frame', msg.data.buffer);
    } else {
      this._syncFormatWithWriter(format);
      this.writer.writeFrame(0, msg.data);
    }
  }

  onTransformLogDone(req, msg) {
    // TODO: This message is almost always just a plain object
    // but the special handling for here feels awkard
    const resp = JSON.stringify(msg.data.buffer);
    this.sink.writeSync('done', resp);
  }
}
