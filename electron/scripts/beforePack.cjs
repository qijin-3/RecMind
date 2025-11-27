const { execSync } = require('node:child_process');

module.exports = async function beforePack() {
  try {
    execSync('npm prune --production', { stdio: 'inherit' });
    execSync('npm dedupe', { stdio: 'inherit' });
  } catch (error) {
    console.warn('[beforePack] prune/dedupe failed:', error);
  }
};

