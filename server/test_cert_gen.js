const selfsigned = require('selfsigned');

console.log('Generating...');
const attrs = [{ name: 'commonName', value: 'localhost' }];
try {
    const pems = selfsigned.generate(attrs, { days: 365, algorithm: 'sha256' });
    console.log('Type:', typeof pems);
    console.log('Keys:', Object.keys(pems));
    console.log('Cert length:', pems.cert ? pems.cert.length : 'undefined');
    console.log('Private length:', pems.private ? pems.private.length : 'undefined');
} catch (e) {
    console.error('Error:', e);
}
