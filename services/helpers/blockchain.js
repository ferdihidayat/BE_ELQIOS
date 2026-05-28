const crypto = require('crypto');

class Block {
  constructor(index, timestamp, data, previousHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return crypto.createHash('sha256')
      .update(this.index + this.previousHash + this.timestamp + JSON.stringify(this.data) + this.nonce)
      .digest('hex');
  }

    mineBlock(difficulty) {
        if (typeof difficulty !== 'number' || difficulty < 1 || difficulty > 10) {
            throw new Error('Difficulty harus angka antara 1 sampai 10');
        }

        const target = Array(difficulty + 1).join("0");
        while (!this.hash.startsWith(target)) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        console.log(`✅ Block mined: ${this.hash}`);
    }

}

class Blockchain {
  constructor() {
    this.difficulty = 4; // tingkat kesulitan mining
    this.chain = [this.createGenesisBlock()];    
  }

  createGenesisBlock() {
    const genesis = new Block(0, Date.now().toString(), "Genesis Block", "0");
    genesis.mineBlock(this.difficulty);
    return genesis;
  }

  getLatestBlock() {
    return this.chain[this.chain.length -1];
  }

  addBlock(newBlock) {
  newBlock.previousHash = this.getLatestBlock().hash;
  console.log('DEBUG difficulty:', this.difficulty);
  newBlock.mineBlock(this.difficulty);
  this.chain.push(newBlock);
}


  isChainValid() {
    for (let i=1; i<this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i-1];

      if (current.hash !== current.calculateHash()) return false;
      if (current.previousHash !== previous.hash) return false;
    }
    return true;
  }
}

module.exports = {Blockchain, Block };
