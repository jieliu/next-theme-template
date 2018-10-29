'use strict'

const path = require('path');
const rmdir = require('rimraf');
const webpack = require('webpack');
const fs = require('fs');
const co = require('co');

const BASE_DIR = path.dirname(__dirname);

const config = require('../webpack.config.js');
const distPath = path.join(process.cwd(), 'dist');

function build(minimize = false) {
  return new Promise((resolve, reject) => {
    webpack(config({minimize})).run((err, stats) => {
      if (err) {
        reject(err);
      } else {
        const errors = stats.toJson().errors;
        if (errors.length) {
          reject(stats.toString({
            chunkModules: false,
          }));
        } else {
          resolve(stats);
        }
      }
    });
  });
}

function emendLess() {
  let less = fs.readFileSync(path.join(BASE_DIR, 'variables.less'), 'utf8');
  
  less = less.replace(/\/\/ lessUnsupport[\s\S]*/g, '');
  fs.writeFileSync(path.join(BASE_DIR, 'variables.less'), less)
}

co(function*() {
  // build
  console.log('# build');
  yield build();
  console.log('# build minimize');
  yield build(true);

  // 修正less 
  console.log('# emend less')
  emendLess()

  // remove bin dir
  console.log('# remove bin dir');
  rmdir.sync(path.join(BASE_DIR, 'webpack.config.js'));
  rmdir.sync(path.join(BASE_DIR, 'bin'));

  const depName = '{{library.name}}';
  const depPureName = depName.split('/').slice(-1);

  let css = fs.readFileSync(path.join(BASE_DIR, `dist/${depPureName}.css`), 'utf8');
  fs.writeFileSync(path.join(BASE_DIR, 'index.css'), css);

  let mincss = fs.readFileSync(path.join(BASE_DIR, `dist/${depPureName}.min.css`), 'utf8');
  fs.writeFileSync(path.join(BASE_DIR, 'index.min.css'), mincss);

  try {
    fs.unlinkSync(path.join(distPath, 'next-noreset.min.js'));
    fs.unlinkSync(path.join(distPath, 'next-noreset.js'));
  } catch(e) {
    console.log('remove next-noreset.js or next-noreset.min.js failed: ', e);
  }

}).catch(err => {
  console.error(err.stack || err);
  process.exit(1);
})
