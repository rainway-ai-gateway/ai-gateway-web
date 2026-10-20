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
var path = require('path');
var config = require('./config');
var webpack = require('webpack');
var { merge } = require('webpack-merge');
var baseWebpackConfig = require('./webpack.base.conf');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var MiniCssExtractPlugin = require('mini-css-extract-plugin');
var TerserPlugin = require('terser-webpack-plugin');
var CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
var env = config.build.env;

var assetsPath = function (_path) {
  return path.posix.join(config.build.assetsSubDirectory, _path);
};

var webpackConfig = merge(baseWebpackConfig, {
  mode: 'production',
  output: {
    path: config.build.assetsRoot,
    filename: assetsPath('js/[name].js'),
    chunkFilename: assetsPath('js/[name].[contenthash].min.js'),
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        visual_vendors: {
          test: /[\\/]node_modules[\\/]echarts|moment(.*)\.js$/,
          name: 'visual_vendors',
          chunks: 'all',
        },
        vendors: {
          test: /[\\/]node_modules[\\/](?!iview|vue|echarts|moment)(.*)\.js$/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
    minimizer: [
      new TerserPlugin({
        test: /\.js(\?.*)?$/i,
        terserOptions: {
          ecma: 2015,
          compress: {
            ecma: 2015,
          },
          format: {
            comments: false,
          },
        },
        parallel: true,
      }),
      new CssMinimizerPlugin(),
    ],
  },
  plugins: [
    // extract css into its own file
    new MiniCssExtractPlugin({
      filename: assetsPath('css/[name].css'),
    }),

    // generate dist index.html with correct asset hash for caching.
    // you can customize output by editing /index.html
    // see https://github.com/ampedandwired/html-webpack-plugin
    new HtmlWebpackPlugin({
      filename: config.build.index,
      template: 'index.html',
      inject: true,
      hash: true,
    }),
    new webpack.DefinePlugin({
      'process.env': {
        VUE_APP_UUAP_URL: '""',
        NODE_ENV: '"production"',
      },
    }),
  ],
});

if (config.build.productionGzip) {
  var CompressionWebpackPlugin = require('compression-webpack-plugin');

  webpackConfig.plugins.push(
    new CompressionWebpackPlugin({
      filename: '[path][base].gz[query]',
      algorithm: 'gzip',
      test: new RegExp(
        '\\.(' + config.build.productionGzipExtensions.join('|') + ')$',
      ),
      threshold: 10240,
      minRatio: 0.8,
    }),
  );
}

module.exports = webpackConfig;
