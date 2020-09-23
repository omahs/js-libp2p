'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai
const sinon = require('sinon')

const AddressManager = require('../../src/address-manager')
const TransportManager = require('../../src/transport-manager')
const PeerStore = require('../../src/peer-store')
const Transport = require('libp2p-tcp')
const PeerId = require('peer-id')
const multiaddr = require('multiaddr')
const mockUpgrader = require('../utils/mockUpgrader')
const Peers = require('../fixtures/peers')
const addrs = [
  multiaddr('/ip4/127.0.0.1/tcp/0'),
  multiaddr('/ip4/127.0.0.1/tcp/0')
]

describe('Transport Manager (TCP)', () => {
  let tm
  let localPeer

  before(async () => {
    localPeer = await PeerId.createFromJSON(Peers[0])
  })

  before(() => {
    tm = new TransportManager({
      libp2p: {
        addressManager: new AddressManager({ listen: addrs }),
        PeerStore: new PeerStore({ peerId: localPeer })
      },
      upgrader: mockUpgrader,
      onConnection: () => {}
    })
  })

  afterEach(async () => {
    await tm.removeAll()
    expect(tm._transports.size).to.equal(0)
  })

  it('should be able to add and remove a transport', async () => {
    tm.add(Transport.prototype[Symbol.toStringTag], Transport)
    expect(tm._transports.size).to.equal(1)
    await tm.remove(Transport.prototype[Symbol.toStringTag])
  })

  it('should be able to listen', async () => {
    sinon.spy(tm, '_createSelfPeerRecord')

    tm.add(Transport.prototype[Symbol.toStringTag], Transport)
    await tm.listen(addrs)
    expect(tm._listeners).to.have.key(Transport.prototype[Symbol.toStringTag])
    expect(tm._listeners.get(Transport.prototype[Symbol.toStringTag])).to.have.length(addrs.length)

    // Created Self Peer record on new listen address
    expect(tm._createSelfPeerRecord.callCount).to.equal(addrs.length)

    // Ephemeral ip addresses may result in multiple listeners
    expect(tm.getAddrs().length).to.equal(addrs.length)
    await tm.close()
    expect(tm._listeners.get(Transport.prototype[Symbol.toStringTag])).to.have.length(0)
  })

  it('should be able to dial', async () => {
    tm.add(Transport.prototype[Symbol.toStringTag], Transport)
    await tm.listen(addrs)
    const addr = tm.getAddrs().shift()
    const connection = await tm.dial(addr)
    expect(connection).to.exist()
    await connection.close()
  })
})
