#!/bin/sh

rm -fr "~/.cache"

TYPESCRIPT_CACHE_DIR="~/.cache" meteor test-packages --once --driver-package=dispatch:mocha-phantomjs ./
