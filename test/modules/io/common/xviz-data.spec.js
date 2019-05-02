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
/* global Buffer */
import tape from 'tape-catch';

import {XVIZData, XVIZBinaryWriter, XVIZFormat, TextEncoder} from '@xviz/io';

// Source test data
import TestXVIZSnapshot from 'test-data/sample-xviz';

// Various formats for the test data
const TestXVIZSnapshotString = JSON.stringify(TestXVIZSnapshot);
const TestXVIZSnapshotBuffer = new TextEncoder().encode(JSON.stringify(TestXVIZSnapshot));
let TestXVIZSnapshotGLB = null;

// make binary in memory
const writer = new XVIZBinaryWriter({
  writeSync: (n, d) => {
    TestXVIZSnapshotGLB = d;
  }
});
writer.writeFrame(0, TestXVIZSnapshot);

// Load the data in XVIZData and verify the format
const TestCases = [
  {
    data: TestXVIZSnapshot,
    description: 'XVIZ Object',
    format: XVIZFormat.OBJECT
  },
  {
    data: TestXVIZSnapshotString,
    description: 'XVIZ String',
    format: XVIZFormat.JSON_STRING
  },
  {
    data: `   ${TestXVIZSnapshotString}   `,
    description: 'XVIZ String with whitespace head and tail',
    format: XVIZFormat.JSON_STRING
  },
  {
    data: TestXVIZSnapshotBuffer,
    description: 'XVIZ String Buffer',
    format: XVIZFormat.JSON_BUFFER
  },
  {
    data: TestXVIZSnapshotGLB,
    description: 'XVIZ Binary Buffer',
    format: XVIZFormat.BINARY
  },
  {
    data: Buffer.from(TestXVIZSnapshotBuffer),
    description: 'XVIZ String NodeBuffer',
    format: XVIZFormat.JSON_BUFFER,
    nodeOnly: true
  },
  {
    data: Buffer.from(TestXVIZSnapshotGLB),
    description: 'XVIZ Binary NodeBuffer',
    format: 'BINARY',
    nodeOnly: true
  }
];

tape('XVIZData#constructor', t => {
  const isBrowser = typeof window !== 'undefined';

  for (const test of TestCases) {
    if (test.nodeOnly === true && isBrowser) {
      continue; // eslint-disable-line no-continue
    }

    const xvizObj = new XVIZData(test.data);
    t.equal(
      xvizObj.format,
      test.format,
      `${test.description} matches expected format ${test.format}`
    );

    const msg = xvizObj.message();
    t.equal(msg.type, 'state_update', `${test.description} has expected XVIZ type`);
    t.ok(msg.data.updates[0].timestamp, `${test.description} has expected timestamp present`);
  }

  t.end();
});
