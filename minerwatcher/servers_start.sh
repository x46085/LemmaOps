#!/bin/bash

npm install

forever start ./node_modules/statsd/stats.js statsd_config.js
forever start cudaminder_watcher.js
