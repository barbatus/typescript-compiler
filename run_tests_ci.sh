#!/bin/sh

rm -fr "~/.cache"

VELOCITY_TEST_PACKAGES=1 TYPESCRIPT_CACHE_DIR="~/.cache" meteor test-packages --velocity ./
