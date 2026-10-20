/**
 * Copyright(c) 2026 The rainway-ai-gateway Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http: //www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Copyright (c) 2021 The BFE Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
process.env.NODE_ENV = 'production';
var path = require('path');
var config = require('./config');
var ora = require('ora');
const fs = require('fs-extra');
var webpack = require('webpack');
var webpackConfig = require('./webpack.prod.conf');

var spinner = ora('building for production...');
spinner.start();

var assetsPath = path.join(
  config.build.assetsRoot,
  config.build.assetsSubDirectory,
);
fs.removeSync(assetsPath);
fs.mkdirpSync(assetsPath);

var staticPath = path.resolve('static');
if (fs.existsSync(staticPath)) {
  fs.copySync(staticPath, assetsPath);
}

webpack(webpackConfig, function (err, stats) {
  spinner.stop();
  process.stdout.write(
    stats.toString({
      colors: true,
      modules: false,
      children: false,
      chunks: false,
      chunkModules: false,
    }) + '\n',
  );
  if (err || stats.hasErrors()) {
    process.exit(1);
  }

  // 品牌资源以独立目录输出，部署后可直接修改，无需重新构建
  var brandingPath = path.resolve('branding');
  if (fs.existsSync(brandingPath)) {
    fs.copySync(brandingPath, path.resolve(config.build.assetsRoot, 'branding'));
  }
});
