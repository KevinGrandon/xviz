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
/* global console */
/* eslint-disable no-console */
const setupArgs = require('./args').setupArgs;

import {XVIZServer} from './server/server';
import {XVIZSession} from './server/xviz-session';
import {XVIZProviderFactory} from '@xviz/io';

import {ROSBAGDataProvider} from '@xviz/ros';
XVIZProviderFactory.addProviderClass(ROSBAGDataProvider);

export function main() {
  // TODO: Need to collect argument handling across possible sources
  const args = setupArgs();

  const options = {
    ...args.argv
  };

  if (Number.isFinite(args.argv.delay)) {
    options.delay = args.argv.delay;
  }

  const xvizSession = new XVIZSession(XVIZProviderFactory, options);
  const wss = new XVIZServer([xvizSession], options, () => {
    console.log(`[= XVIZ Server] listening on port ${wss.server.address().port}`);
  });
}
