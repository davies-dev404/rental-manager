const path = require('path');
const { spawn } = require('child_process');

if (process.env.NODE_ENV === 'production') {
  require(path.resolve(__dirname, '../server'));
} else {
  try {
    const nodemonBin = require.resolve('nodemon/bin/nodemon.js');
    const child = spawn(process.execPath, [nodemonBin, path.resolve(__dirname, '../server.js')], {
      stdio: 'inherit'
    });
    child.on('exit', (code) => process.exit(code ?? 0));
  } catch {
    require(path.resolve(__dirname, '../server'));
  }
}
