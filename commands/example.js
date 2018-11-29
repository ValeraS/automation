const util = require('util');

exports.command = 'name <param> [optParam]';

exports.desc = 'Meaningful description';

exports.builder = function(yargs) {
  yargs
    .positional('param', {
      desc: 'Helpful description',
      choices: ['one', 'two', 'three']
    })
    .positional('optParam', {
      desc: 'Helpful description',
      type: 'number'
    })
    .option('option', {
      desc: 'Helpful description',
      alias: 'o',
      type: 'number',
      demand: true
    })
    .check(function(argv) {
      if (argv.hasOwnProperty('optParam')) {
        if (isNaN(argv.optParam)) {
          throw 'optParam should be a number';
        }
      }
      return true;
    });
};

exports.handler = function(argv) {
  console.log(`Execute 'name' command with args ${util.inspect(argv)}`);
};
