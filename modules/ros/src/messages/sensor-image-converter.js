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
import sharp from 'sharp';

export class SensorImage {
  constructor(topic, xvizStream) {
    this.topic = topic;
    this.xvizStream = xvizStream || topic;
  }

  static get topicType() {
    return 'sensor_msgs/Image';
  }

  async convertFrame(frame, xvizBuilder) {
    const msgs = frame[this.topic];
    if (!msgs) {
      return;
    }

    if (msgs.length) {
      const {message} = msgs[msgs.length - 1];
      const {width, height, /* encoding, step, */ data} = message;

      // TODO: encoding is ignored, this only works by luck ;)
      // http://docs.ros.org/jade/api/sensor_msgs/html/image__encodings_8h_source.html
      // voyage had bgr8

      const imgData = await sharp(data, {
        raw: {
          width,
          height,
          channels: 3
        }
      })
        .resize(400)
        .toFormat('png')
        .toBuffer();

      xvizBuilder
        .primitive(this.xvizStream)
        .image(nodeBufferToTypedArray(imgData), 'png')
        .dimensions(width, height);
    }
  }

  getMetadata(xvizMetaBuilder) {
    const xb = xvizMetaBuilder;
    xb.stream(this.xvizStream)
      .category('primitive')
      .type('image');
  }
}

function nodeBufferToTypedArray(buffer) {
  // TODO - per docs we should just be able to call buffer.buffer, but there are issues
  const typedArray = new Uint8Array(buffer);
  return typedArray;
}
