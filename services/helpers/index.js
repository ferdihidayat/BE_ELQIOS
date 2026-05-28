const _unixId = require('./uuid.js')
const encryption = require('./encrypt.js');


export function UnixID(){
    return new _unixId();
}

export function SimpleEncryption() {
    return new encryption();
}