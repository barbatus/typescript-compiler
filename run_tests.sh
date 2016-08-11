#!/bin/sh

rm -fr "~/.cache"

TYPESCRIPT_LOG=1 TYPESCRIPT_CACHE_DIR="~/.cache" meteor test-packages --release=1.3.1 --driver-package=practicalmeteor:mocha ./
