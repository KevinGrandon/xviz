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

import {flattenToTypedArray} from '../../utils';

function packBinaryJsonTypedArray(gltfBuilder, object, objectKey, info) {
  if (gltfBuilder.isImage(object)) {
    const imageIndex = gltfBuilder.addImage(object);
    return `#/images/${imageIndex}`;
  }
  // if not an image, pack as accessor
  const opts = info && info.size ? {size: info.size} : {size: 3};
  const bufferIndex = gltfBuilder.addBuffer(object, opts);
  return `#/accessors/${bufferIndex}`;
}

// Follows a convention used by @loaders.gl to use JSONPointers
// to encode where the binary data for a XVIZ element resides.
// The unpacking is handled automatically by @loaders.gl
export function packBinaryJson(json, gltfBuilder, objectKey = null, options = {}) {
  const {flattenArrays = true} = options;
  let object = json;
  let objectInfo = null;

  // Check if string has same syntax as our "JSON pointers", if so "escape it".
  if (typeof object === 'string' && object.indexOf('#/') === 0) {
    return `#${object}`;
  }

  if (Array.isArray(object)) {
    // TODO - handle numeric arrays, flatten them etc.
    const flatObject = flattenArrays && flattenObject(objectKey, object);
    if (flatObject) {
      object = flatObject.typedArray;
      objectInfo = flatObject;
    } else {
      return object.map(element => packBinaryJson(element, gltfBuilder, options));
    }
  }

  // Typed arrays, pack them as binary
  if (ArrayBuffer.isView(object) && gltfBuilder) {
    return packBinaryJsonTypedArray(gltfBuilder, object, objectKey, objectInfo);
  }

  if (object !== null && typeof object === 'object') {
    const newObject = {};
    for (const key in object) {
      newObject[key] = packBinaryJson(object[key], gltfBuilder, key, options);
    }
    return newObject;
  }

  return object;
}

function flattenObject(key, object) {
  if (key === 'vertices' || key === 'points') {
    // Flatten nested vertices
    return {
      typedArray: flattenToTypedArray(object, 3, Float32Array),
      size: 3
    };
  }
  if (key === 'colors') {
    const size = object[0].length === 4 ? 4 : 3;
    return {
      typedArray: flattenToTypedArray(object, size, Uint8Array),
      size
    };
  }
  return null;
}
