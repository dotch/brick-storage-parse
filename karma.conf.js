var fs = require("fs");
fs.writeFileSync("env.js","var env=" + JSON.stringify(process.env));


module.exports = function(config){
  config.set({
    basePath: '.',

    files : [
      'env.js',
      'bower_components/platform/platform.js',
      'test/browser.js',
      {pattern: 'src/*', watched: true, included: false, served: true}
    ],

    autoWatch : true,

    frameworks: ['mocha', 'chai', 'chai-as-promised'],

    browsers : ['Firefox'],

    plugins : [
      'karma-firefox-launcher',
      'karma-mocha',
      'karma-chai',
      'karma-chai-plugins',
    ],
  });
};
