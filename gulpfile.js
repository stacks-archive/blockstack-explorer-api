const { src, dest, parallel } = require('gulp');
const prettier = require('gulp-prettier');
const jsonschemaDeref = require('gulp-jsonschema-deref');

const schemaFiles = 'docs/**/*.schema.json';
const buildFolder = 'dist';

function flattenSchemas() {
  return src(schemaFiles)
    .pipe(jsonschemaDeref())
    .pipe(prettier())
    .pipe(dest(buildFolder));
}

function copyFiles() {
  return src(['docs/**/*.example.json', 'docs/**/*.yml']).pipe(
    dest(buildFolder)
  );
}

exports.default = parallel(flattenSchemas, copyFiles);
