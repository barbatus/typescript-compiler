#!/bin/sh

rm -fr "~/.cache"

TYPESCRIPT_LOG=1 METEOR_PROFILE=1000 TYPESCRIPT_CACHE_DIR="~/.cache" meteor test-packages --driver-package=practicalmeteor:mocha ./
