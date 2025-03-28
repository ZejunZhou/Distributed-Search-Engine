/** @typedef {import("../types.js").Node} Node */

const assert = require('assert');
const crypto = require('crypto');

// The ID is the SHA256 hash of the JSON representation of the object
/** @typedef {!string} ID */

/**
 * @param {any} obj
 * @return {ID}
 */
function getID(obj) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(obj));
  return hash.digest('hex');
}

/**
 * The NID is the SHA256 hash of the JSON representation of the node
 * @param {Node} node
 * @return {ID}
 */
function getNID(node) {
  node = {ip: node.ip, port: node.port};
  return getID(node);
}

/**
 * The SID is the first 5 characters of the NID
 * @param {Node} node
 * @return {ID}
 */
function getSID(node) {
  return getNID(node).substring(0, 5);
}


function getMID(message) {
  const msg = {};
  msg.date = new Date().getTime();
  msg.mss = message;
  return getID(msg);
}

function idToNum(id) {
  const n = parseInt(id, 16);
  assert(!isNaN(n), 'idToNum: id is not in KID form!');
  return n;
}

function naiveHash(kid, nids) {
  nids.sort();
  return nids[idToNum(kid) % nids.length];
}

function consistentHash(kid, nids) {
  const hashedKid = crypto.createHash("sha256").update(kid).digest("hex");
  const kidNum = BigInt("0x" + hashedKid);

  const items = nids.map(nid => {
    const hashedNid = crypto.createHash("sha256").update(nid).digest("hex");
    return {
      type: 'nid',
      id: nid,
      num: BigInt("0x" + hashedNid)
    };
  });

  items.push({
    type: 'kid',
    id: kid,
    num: kidNum
  });

  items.sort((a, b) => (a.num > b.num ? 1 : (a.num < b.num ? -1 : 0)));

  const index = items.findIndex(item => item.type === 'kid' && item.id === kid);
  const targetIndex = (index + 1) % items.length;
  const targetItem = items[targetIndex];
  return targetItem.id;
}


function rendezvousHash(kid, nids) {
  let maxWeight = -1n; 
  let chosenNid = null;
  for (const nid of nids) {
    const candidate = kid + nid;
    const hashHex = crypto.createHash('sha256').update(candidate).digest('hex');
    const weight = BigInt('0x' + hashHex);
    if (weight > maxWeight) {
      maxWeight = weight;
      chosenNid = nid;
    }
  }
  return chosenNid;
}

module.exports = {
  getID,
  getNID,
  getSID,
  getMID,
  naiveHash,
  consistentHash,
  rendezvousHash,
};
