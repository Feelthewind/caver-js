/*
    Copyright 2020 The caver-js Authors
    This file is part of the caver-js library.

    The caver-js library is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    The caver-js library is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
    GNU Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public License
    along with the caver-js. If not, see <http://www.gnu.org/licenses/>.
*/

const RLP = require('eth-lib/lib/rlp')
const Bytes = require('eth-lib/lib/bytes')
const _ = require('lodash')
const AbstractFeeDelegatedTransaction = require('../abstractFeeDelegatedTransaction')
const { TX_TYPE_STRING, TX_TYPE_TAG } = require('../../transactionHelper/transactionHelper')
const utils = require('../../../../caver-utils/src')

function _decode(rlpEncoded) {
    rlpEncoded = utils.addHexPrefix(rlpEncoded)
    if (!rlpEncoded.startsWith(TX_TYPE_TAG.TxTypeFeeDelegatedValueTransferMemo))
        throw new Error(
            `Cannot decode to FeeDelegatedValueTransferMemo. The prefix must be ${TX_TYPE_TAG.TxTypeFeeDelegatedValueTransferMemo}: ${rlpEncoded}`
        )

    const typeDettached = `0x${rlpEncoded.slice(4)}`
    const [nonce, gasPrice, gas, to, value, from, input, signatures, feePayer, feePayerSignatures] = RLP.decode(typeDettached)
    return {
        nonce: utils.trimLeadingZero(nonce),
        gasPrice: utils.trimLeadingZero(gasPrice),
        gas: utils.trimLeadingZero(gas),
        to,
        value: utils.trimLeadingZero(value),
        from,
        input,
        signatures,
        feePayer,
        feePayerSignatures,
    }
}

/**
 * Represents a fee delegated value transfer memo transaction.
 * Please refer to {@link https://docs.klaytn.com/klaytn/design/transactions/fee-delegation#txtypefeedelegatedvaluetransfermemo|FeeDelegatedValueTransferMemo} to see more detail.
 * @class
 * @hideconstructor
 * @augments AbstractFeeDelegatedTransaction
 */
class FeeDelegatedValueTransferMemo extends AbstractFeeDelegatedTransaction {
    /**
     * Creates a fee delegated value transfer memo transaction.
     * @method create
     * @param {object|string} createTxObj - The parameters to create a FeeDelegatedValueTransferMemo transaction. This can be an object defining transaction information, or it can be an RLP-encoded string.
     *                                      If it is an RLP-encoded string, decode it to create a transaction instance.
     *                                      The object can define `from`, `to`, `value`, `input`, `nonce`, `gas`, `gasPrice`, `signatures`, `feePayer`, `feePayerSignatures` and `chainId`.
     * @return {FeeDelegatedValueTransferMemo}
     */
    static create(createTxObj) {
        return new FeeDelegatedValueTransferMemo(createTxObj)
    }

    /**
     * decodes the RLP-encoded string and returns a FeeDelegatedValueTransferMemo transaction instance.
     *
     * @param {string} rlpEncoded The RLP-encoded fee delegated value transfer memo transaction.
     * @return {FeeDelegatedValueTransferMemo}
     */
    static decode(rlpEncoded) {
        return new FeeDelegatedValueTransferMemo(_decode(rlpEncoded))
    }

    /**
     * Creates a fee delegated value transfer memo transaction.
     * @constructor
     * @param {object|string} createTxObj - The parameters to create a FeeDelegatedValueTransferMemo transaction. This can be an object defining transaction information, or it can be an RLP-encoded string.
     *                                      If it is an RLP-encoded string, decode it to create a transaction instance.
     *                                      The object can define `from`, `to`, `value`, `input`, `nonce`, `gas`, `gasPrice`, `signatures`, `feePayer`, `feePayerSignatures` and `chainId`.
     */
    constructor(createTxObj) {
        if (_.isString(createTxObj)) createTxObj = _decode(createTxObj)
        super(TX_TYPE_STRING.TxTypeFeeDelegatedValueTransferMemo, createTxObj)
        this.to = createTxObj.to
        this.value = createTxObj.value

        if (createTxObj.input && createTxObj.data)
            throw new Error(`'input' and 'data' properties cannot be defined at the same time, please use either 'input' or 'data'.`)

        this.input = createTxObj.input || createTxObj.data
    }

    /**
     * @type {string}
     */
    get to() {
        return this._to
    }

    set to(address) {
        if (!utils.isAddress(address)) throw new Error(`Invalid address of to: ${address}`)
        this._to = address.toLowerCase()
    }

    /**
     * @type {string}
     */
    get value() {
        return this._value
    }

    set value(val) {
        this._value = utils.numberToHex(val)
    }

    /**
     * @type {string}
     */
    get input() {
        return this._input
    }

    set input(input) {
        if (!input || !utils.isHex(input)) throw new Error(`Invalid input data ${input}`)
        this._input = utils.addHexPrefix(input)
    }

    /**
     * @type {string}
     */
    get data() {
        return this._input
    }

    set data(data) {
        this._input = data
    }

    /**
     * Returns the RLP-encoded string of this transaction (i.e., rawTransaction).
     *
     * @example
     * const result = tx.getRLPEncoding()
     *
     * @return {string} An RLP-encoded transaction string.
     */
    getRLPEncoding() {
        this.validateOptionalValues()
        const signatures = this.signatures.map(sig => sig.encode())
        const feePayerSignatures = this.feePayerSignatures.map(sig => sig.encode())

        return (
            TX_TYPE_TAG.TxTypeFeeDelegatedValueTransferMemo +
            RLP.encode([
                Bytes.fromNat(this.nonce),
                Bytes.fromNat(this.gasPrice),
                Bytes.fromNat(this.gas),
                this.to.toLowerCase(),
                Bytes.fromNat(this.value),
                this.from.toLowerCase(),
                this.input,
                signatures,
                this.feePayer.toLowerCase(),
                feePayerSignatures,
            ]).slice(2)
        )
    }

    /**
     * Returns the RLP-encoded string to make the signature of this transaction.
     * This method has to be overrided in classes which extends AbstractTransaction.
     * getCommonRLPEncodingForSignature is used in getRLPEncodingForSignature.
     *
     * @example
     * const result = tx.getCommonRLPEncodingForSignature()
     *
     * @return {string} An RLP-encoded transaction string without signature.
     */
    getCommonRLPEncodingForSignature() {
        this.validateOptionalValues()

        return RLP.encode([
            TX_TYPE_TAG.TxTypeFeeDelegatedValueTransferMemo,
            Bytes.fromNat(this.nonce),
            Bytes.fromNat(this.gasPrice),
            Bytes.fromNat(this.gas),
            this.to.toLowerCase(),
            Bytes.fromNat(this.value),
            this.from.toLowerCase(),
            this.input,
        ])
    }
}

module.exports = FeeDelegatedValueTransferMemo
