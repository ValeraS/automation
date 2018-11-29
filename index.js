#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const yargs = require('yargs');

// eslint-disable-next-line no-unused-expressions
yargs
  .usage('Usage: $0 <command> [options]')
  .demandCommand(1)
  .env()
  .option('github-username', { demand: true })
  .option('github-access-token', { demand: true })
  .option('repo', { alias: 'repository', demand: true })
  .option('repo-owner', { alias: 'repository-owner', demand: true })
  .option('timeout', { default: 1500, type: 'number' })
  .commandDir('commands').argv;
