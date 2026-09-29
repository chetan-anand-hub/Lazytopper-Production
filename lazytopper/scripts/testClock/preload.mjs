// Node preload for the test clock. Load it with
//   NODE_OPTIONS="--import <absolute path>/lazytopper/scripts/testClock/preload.mjs"
// so EVERY node process of a test run (node --test and the child processes it spawns inherit
// NODE_OPTIONS) sees LT_TEST_CLOCK as "now". With LT_TEST_CLOCK unset this does nothing.
// See testClock.mjs.
import { installTestClockFromEnv } from "./testClock.mjs";

installTestClockFromEnv();
