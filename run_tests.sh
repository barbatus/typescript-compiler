#!/bin/sh

rm -fr "~/.cache"

VELOCITY_TEST_PACKAGES=1 TYPESCRIPT_LOG=1 TYPESCRIPT_CACHE_DIR="~/.cache" meteor test-packages --driver-package=velocity:html-reporter ./
