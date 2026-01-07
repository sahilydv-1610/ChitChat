const fs = require('fs');
const os = require('os');
const forge = require('node-forge');

function log(m) { try { fs.appendFileSync('mkcert_log.txt', m + '\n'); } catch (e) { } }

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

log('Starting mkcert...');
try {
    log('Forge required');
    console.log("Generating 2048-bit key-pair...");
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();

    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

    const attrs = [{
        name: 'commonName',
        value: 'localhost'
    }, {
        name: 'countryName',
        value: 'US'
    }, {
        shortName: 'ST',
        value: 'Virginia'
    }, {
        name: 'localityName',
        value: 'Blacksburg'
    }, {
        name: 'organizationName',
        value: 'Test'
    }, {
        shortName: 'OU',
        value: 'Test'
    }];

    cert.setSubject(attrs);
    cert.setIssuer(attrs);

    const localIP = getLocalIP();
    console.log(`Detected Local IP: ${localIP}`);

    cert.setExtensions([{
        name: 'basicConstraints',
        cA: true
    }, {
        name: 'keyUsage',
        keyCertSign: true,
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true
    }, {
        name: 'extKeyUsage',
        serverAuth: true,
        clientAuth: true,
        codeSigning: true,
        emailProtection: true,
        timeStamping: true
    }, {
        name: 'subjectAltName',
        altNames: [{
            type: 2, // DNS
            value: 'localhost'
        }, {
            type: 7, // IP
            ip: '127.0.0.1'
        }, {
            type: 7, // IP
            ip: localIP
        }]
    }]);

    cert.sign(keys.privateKey);

    const pem_cert = forge.pki.certificateToPem(cert);
    const pem_key = forge.pki.privateKeyToPem(keys.privateKey);

    fs.writeFileSync('cert.pem', pem_cert);
    fs.writeFileSync('key.pem', pem_key);

    console.log(`Certificate created for localhost and ${localIP}`);
    log('Success');
} catch (e) {
    log('Error: ' + e.message);
    console.error(e);
    process.exit(1);
}

