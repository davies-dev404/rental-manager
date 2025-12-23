const bcrypt = require('bcryptjs');

async function test() {
    console.log('Testing bcryptjs...');
    try {
        const hash = await bcrypt.hash('password', 10);
        console.log('Hash success:', hash);
        const match = await bcrypt.compare('password', hash);
        console.log('Compare success:', match);
    } catch (e) {
        console.error('Bcrypt failed:', e);
    }
}

test();
