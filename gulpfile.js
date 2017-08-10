var gulp = require('gulp'),
    rename = require('gulp-rename'),
    jsontransform = require('gulp-json-transform'),
    concatjson = require('gulp-concat-json'),
    clean = require('gulp-clean'),
    run = require('run-sequence'),
    exec = require('gulp-exec'),
    bibtex2json = require('./citation/bibtex2json'),
    fs = require('fs'),
    sh = require('sync-exec'),
    gulpif = require('gulp-if');
var startColor = color = 0;

var paths = {
    src: 'app',
    dev: 'www',
    json: 'comparison-elements-json/',
    data: 'app/components/comparison/data/'
};

var files = {
    data: [
        './app/components/comparison/data/*.json',
        './comparison-configuration/*',
        './citation/output/*',
        './favicon.ico'
    ],
    markdown: [
        './comparison-elements/*.md'
    ],
    json: [
        './comparison-elements-json/*.json'
    ]
}

var destfiles = {
    index: './www'
}

// BUILD / UPDATE data files -------------------------------------<
gulp.task('build-data', function (callback) {
    run('versioninfo', 'determinecolors', 'markdown', 'json', 'citation', callback);
})

gulp.task('determinecolors', function() {
    var input = './comparison-configuration/table.json';
    var colorArray = [
        'hsl(000, 100%, 70%)',
        'hsl(15, 100%, 70%)',
        'hsl(30, 100%, 70%)',
        'hsl(45, 100%, 70%)',
        'hsl(60, 100%, 70%)',
        'hsl(75, 100%, 70%)',
        'hsl(90, 100%, 70%)',
        'hsl(105, 100%, 70%)',
        'hsl(120, 100%, 70%)',
        'hsl(135, 100%, 70%)',
        'hsl(150, 100%, 70%)',
        'hsl(165, 100%, 70%)',
        'hsl(180, 100%, 70%)',
        'hsl(195, 100%, 70%)',
        'hsl(210, 100%, 70%)',
        'hsl(225, 100%, 70%)',
        'hsl(240, 100%, 70%)',
        'hsl(255, 100%, 70%)',
        'hsl(270, 100%, 70%)',
        'hsl(285, 100%, 70%)',
        'hsl(300, 100%, 70%)',
        'hsl(315, 100%, 70%)',
        'hsl(330, 100%, 70%)',
        'hsl(345, 100%, 70%)'
    ];
    var color;
    var data = JSON.parse(fs.readFileSync(input, "utf8"));
    var changed = false;
    var count = 0;
    var cCount = 0;
    for (var i = 0; i < data.length; i++) {
        var o = data[i];
        if (o.type.tag === "label" && o.type.values != null) {
            count += o.type.values.length;
            cCount++;
        }
    }
    var delta = Math.floor(colorArray.length / count);
    if (delta < 1) {
        var columnD = Math.floor(colorArray.length / cCount);
    } else {
        var columnD = 0;
    }
    color = Math.floor(Math.random() * colorArray.length);
    for (var i = 0; i < data.length; i++) {
        var o = data[i];
        if (o.type.tag === "label" && o.type.values != null) {
            if (o.type.values[0].weight === undefined) {
                var vals = o.type.values.sort((o1, o2) => o1.name.toString().localeCompare(o2.name.toString()));
            } else {
                var mult = (o.order === undefined || o.order.toLowerCase() === "asc") ? 1 : -1;
                var vals = o.type.values.sort((o1, o2) => mult * (o1.weight - o2.weight));
            }
            for (var j = 0; j < vals.length; j++) {
                var v = vals[j];
                if (!(v.hasOwnProperty("class") || v.hasOwnProperty("color"))) {
                    v.color = colorArray[color];
                    changed = true;
                    color = (color + delta) % colorArray.length;
                }
            }
        }
        color = (color + columnD) % colorArray.length;
    }
    if (changed) {
        fs.writeFileSync(input, JSON.stringify(data, null, 4), "utf8");
    }
    return true;
});

gulp.task('versioninfo', function () {
    var versionfile = './app/VersionInformation.ts.example';
    var output = './app/VersionInformation.ts';
    var revision = sh('git rev-parse HEAD');
    var date = sh('git log -1 --format=%cd --date=short');
    return gulp.src(versionfile)
        .pipe(rename(output))
        .pipe(gulp.dest('.'))
        .pipe(exec('sed -i\'.bak\' "s/§§date§§/' + date.stdout.trim() + '/" ' + output))
        .pipe(exec('sed -i\'.bak\' "s/§§commit§§/' + revision.stdout.trim() + '/g" ' + output));
})

gulp.task('update-data', function () {
    gulp.watch(files.markdown, ['build-data']);
})

gulp.task('markdown', function(callback){
    var options = {
      continueOnError: false,
      pipeStdout: true
    }

    const isWin = /^win/i.test(process.platform);

    return gulp.src(files.markdown)
    gulpif(condition1, g.dest(output.css))
        .pipe(gulpif(isWin),    exec("gradlew -q -b ./app/java/md-to-json/build.gradle md2json -PappArgs=\"[$/\n<%= file.contents.toString() %>\n/$, 1, true]\"", options))
        .pipe(gulpif(!isWin), exec("./gradlew -q -b ./app/java/md-to-json/build.gradle md2json -PappArgs=\"[$/\n<%= file.contents.toString() %>\n/$, 1, true]\"", options))
        .pipe(rename({extname: ".json"}))
        .pipe(gulp.dest(paths.json));
});

gulp.task('json', function(){
    return gulp.src(files.json)
        .pipe(concatjson("data.json"))
        .pipe(jsontransform(function(data){
            return data;
        }, 2))
        .pipe(gulp.dest(paths.data))
})

gulp.task('citation', function(callback){
    var fileContent = JSON.parse(fs.readFileSync("./citation/config.json", "utf8"));
    bibtex2json.parse('./citation/' + fileContent.bibtex_file, 'utf8', './citation/' + fileContent.bibtex_style, './citation/output', callback);
})
// --------------------------------------------------------------->


// BUILD / UPDATE www folder -------------------------------------<
gulp.task('build-www', ['data'], function () {})

gulp.task('update-www', function () {
    gulp.watch(files.data, ['data']);
})

gulp.task('data', function() {
    return gulp.src(files.data, {base: '.'})
        .pipe(gulp.dest(destfiles.index)); 
});
// --------------------------------------------------------------->

// DELETE www folder ---------------------------------------------<
gulp.task('delete-www', function() {
    return gulp.src(paths.dev, {read: false})
        .pipe(clean());
});
// --------------------------------------------------------------->

// DEFAULT and DEV tasks -----------------------------------------<
gulp.task('default', function(callback){
    run('build-data', 'delete-www', 'build-www', callback);
});

gulp.task('dev', ['default'], function(callback) {
    run('update-data','update-www', callback);
});
// --------------------------------------------------------------->
