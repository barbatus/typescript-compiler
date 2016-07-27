#!/bin/sh

rm -fr "~/.cache"

TYPESCRIPT_CACHE_DIR="~/.cache" meteor test-packages --release=1.4 --once --driver-package=dispatch:mocha-phantomjs ./
