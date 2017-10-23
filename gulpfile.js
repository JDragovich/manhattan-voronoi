const gulp = require('gulp');
const watch = require('gulp-watch');
const sourcemaps = require('gulp-sourcemaps');
const babel = require('gulp-babel');
const concat = require('gulp-concat');
const browserify = require('browserify');
const babelify = require('babelify');
const watchify = require('watchify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const babelPreset = require('babel-preset-es2015');

gulp.task('build-library', () => {
    return gulp.src(['src/**/*.js'])
        .pipe(sourcemaps.init())
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist'));
});

function compile(watch) {
  console.log("rebuilding...");
  var bundler = browserify('./main.js', { debug: true }).transform(babelify.configure({presets: ["es2015"]}));

  function rebundle() {
    bundler.bundle()
      .on('error', function(err) { console.error(err); this.emit('end'); })
      .pipe(source('build.js'))
      .pipe(buffer())
      .pipe(sourcemaps.init({ loadMaps: true }))
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest('./build'));
  }

  if (watch) {
    bundler.on('update', function() {
      console.log('-> bundling...');
      rebundle();
    });
  }

  rebundle();
}

function watchSource() {
  return watch(['src/**/*.js','main.js'], function(){

      compile(true);
  });
};

gulp.task('default',['build-library',"build"]);

gulp.task('build', function() { return compile(); });

gulp.task('watch',function(){
    return gulp.watch(['src/**/*.js','main.js'], ['build']);
});

gulp.task('watch-library',function(){
    return gulp.watch(['src/**/*.js'], ['build-library']);
});
