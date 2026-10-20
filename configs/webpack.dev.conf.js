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
var config = require('./config');
var webpack = require('webpack');
var { merge } = require('webpack-merge');
var baseWebpackConfig = require('./webpack.base.conf');
var HtmlWebpackPlugin = require('html-webpack-plugin');
const FriendlyErrorsPlugin = require('@soda/friendly-errors-webpack-plugin');
var BundleAnalyzerPlugin =
  require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

// add hot-reload entry
Object.keys(baseWebpackConfig.entry).forEach(function (name) {
  baseWebpackConfig.entry[name] = ['./configs/dev-client'].concat(
    baseWebpackConfig.entry[name],
  );
});

var webpackConfig = merge(baseWebpackConfig, {
  mode: 'development',
  devtool: 'source-map',
  stats: 'minimal',
  plugins: [
    // HMR
    new webpack.HotModuleReplacementPlugin({}),

    new webpack.DefinePlugin({
      'process.env': {
        VUE_APP_UUAP_URL: '""',
        NODE_ENV: '"development"',
      },
    }),
    // https://github.com/ampedandwired/html-webpack-plugin
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'index.html',
      inject: true,
    }),
    new FriendlyErrorsPlugin(),

    // new BundleAnalyzerPlugin()
  ],
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/](?!iview|vue|echarts|moment)\.js$/,
          name: 'vendors',
          chunks: 'all',
        },
        visual_vendors: {
          test: /[\\/]node_modules[\\/]echarts|moment[\\/]\.js$/,
          name: 'visual_vendors',
          chunks: 'all',
        },
      },
    },
  },
});

if (config.dev.cssExtract) {
  var MiniCssExtractPlugin = require('mini-css-extract-plugin');
  var path = require('path');
  webpackConfig.plugins.push(
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: '[name].css',
    }),
  );
}

module.exports = webpackConfig;
