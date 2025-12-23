// using native fetch
async function register() {
    console.log('Attempting registration...');
    try {
        const response = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test User',
                email: 'test' + Date.now() + '@example.com',
                password: 'password123',
                role: 'admin'
            })
        });

        console.log('Status:', response.status);
        const text = await response.text();
        try {
            const json = JSON.parse(text);
            console.log('ERROR MESSAGE:', json.message);
            console.log('STACK:', json.stack.split('\n')[0]); // First line of stack
        } catch (e) {
            console.log('RAW BODY:', text);
        }
    } catch (e) {
        console.error('Request failed:', e);
    }
}

register();
