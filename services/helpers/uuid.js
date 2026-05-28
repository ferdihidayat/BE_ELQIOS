const { v4: uuidv4 } = require('uuid');
 // ⇨ '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'

class UnixId {
    constructor(){

    }
    
    version4(){
        let _uuid = uuidv4();
        return _uuid;
    }

}

module.exports = UnixId;