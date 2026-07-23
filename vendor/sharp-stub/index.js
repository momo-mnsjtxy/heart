'use strict';
module.exports = function sharp() {
  throw new Error(
    'sharp is disabled in this project (images.unoptimized=true; no next/image usage).'
  );
};
