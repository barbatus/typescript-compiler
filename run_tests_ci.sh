#!/bin/sh

rm -fr "~/.cache"

TYPESCRIPT_CACHE_DIR="~/.cache" TEST_CLIENT=0 meteor test-packages --once --driver-package=meteortesting:mocha ./
