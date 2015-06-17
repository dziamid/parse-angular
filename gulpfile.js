var gulp = require('gulp'),
  browserify = require('browserify'),
  source = require('vinyl-source-stream');

gulp.task('browserify', function () {
  return browserify('./src/parse-angular.js')
    .external('angular')
    .external('moment')
    .external('parse')
    .bundle()
    //Pass desired output filename to vinyl-source-stream
    .pipe(source('parse-angular.latest.js'))
    // Start piping stream to tasks!
    .pipe(gulp.dest('./dist/'))
});

//todo: add minify

gulp.task('build', ['browserify']);
gulp.task('default', ['build']);
