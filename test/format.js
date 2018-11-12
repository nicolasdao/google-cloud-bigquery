/**
 * Copyright (c) 2018, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

/* global describe */
/* global it */

const { assert } = require('chai')
const { cleanData, fitToSchema } = require('../src/format')

describe('format', () => {
	describe('#cleanData', () => {
		it('Should rename all number properties.', () => {
			const d = new Date()
			const obj_01 = {
				'123': {
					hello: 'world'
				},
				a: 'b',
				b: [
					{
						name: 'Nic',
						age: 37,
						'342': 'Trying to break things'
					}, 
					3, 
					d,
					[{
						'234': [{
							'432': { class: 3, age: 34 }
						}]
					}]
				]
			}

			const newObj_01 = cleanData(obj_01)
			assert.equal(Object.keys(newObj_01).length, 3, '01')
			assert.isOk(newObj_01['#123'], '02')
			assert.isOk(newObj_01.a, '03')
			assert.isOk(newObj_01.b, '04')
			assert.equal(newObj_01['#123'].hello, 'world', '05')
			assert.equal(newObj_01.a, 'b', '06')
			assert.equal(newObj_01.b.length, 4, '07')
			assert.equal(newObj_01.b[0].name, 'Nic', '08')
			assert.equal(newObj_01.b[0].age, 37, '09')
			assert.equal(newObj_01.b[0]['#342'], 'Trying to break things', '10')
			assert.equal(newObj_01.b[1], 3, '11')
			assert.equal(newObj_01.b[2], d, '12')
			assert.equal(newObj_01.b[3].length, 1, '13')
			assert.equal(newObj_01.b[3][0]['#234'].length, 1, '14')
			assert.equal(newObj_01.b[3][0]['#234'][0]['#432'].class, 3, '15')
			assert.equal(newObj_01.b[3][0]['#234'][0]['#432'].age, 34, '16')
		})
	})

	describe('#fitToSchema', () => {
		it('Should transform an object so it fits a specific schema', () => {
			const schema = {
				id: 'number',
				firstName: 'string',
				age: 'number',
				address: {
					line1: 'string',
					line2: 'string',
					postcode: 'string'
				},
				friends: [{
					name: 'string',
					age: 'number',
					dob: 'timestamp',
					married: 'boolean'
				}],
				tags: ['string'],
				note: 'string'
			}
			const obj_01 = {
				id: '123',
				firstName: 'Nicolas',
				lastName: 'Dao',
				age: 37,
				address: {
					line1: 'Waterloo, NSW 2017',
					postcode: 2017
				}
			}
			const newObj_01 = fitToSchema(obj_01, schema)
			assert.equal(newObj_01.id, 123, '01')
			assert.equal(newObj_01.firstName, 'string:Nicolas', '02')
			assert.isNotOk(newObj_01.lastName, '03')
			assert.equal(newObj_01.age, 37, '04')
			assert.equal(newObj_01.address.line1, 'string:Waterloo, NSW 2017', '05')
			assert.equal(newObj_01.address.line2, 'string:NULL', '06')
			assert.equal(newObj_01.address.postcode, 'string:2017', '07')
			assert.equal(newObj_01.address._isNull, false, '08')
			assert.equal(newObj_01.friends.length, 1, '09')
			assert.equal(newObj_01.friends[0]._isNull, true, '10')
			assert.equal(newObj_01.friends[0].name, 'string:NULL', '11')
			assert.equal(newObj_01.friends[0].age, -1, '12')
			assert.equal(newObj_01.friends[0].dob, '1970-01-01T00:00:00.000Z', '13')
			assert.equal(newObj_01.friends[0].married, false, '14')
			assert.equal(newObj_01.tags.length, 1, '15')
			assert.equal(newObj_01.tags[0], 'string:NULL', '16')
			assert.equal(newObj_01.note, 'string:NULL', '16_B')

			const obj_02 = {
				id: '123',
				firstName: 'Nicolas',
				lastName: 'Dao',
				age: 37,
				friends: [{
					name: 'Brendan',
					age: 30,
					dob: new Date(1988,6,24),
					married: 'true'
				}, {
					name: 'Boris'
				}],
				tags:['banana', 123]
			}
			const newObj_02 = fitToSchema(obj_02, schema)
			assert.equal(newObj_02.id, 123, '17')
			assert.equal(newObj_02.firstName, 'string:Nicolas', '18')
			assert.isNotOk(newObj_02.lastName, '19')
			assert.equal(newObj_02.age, 37, '20')
			assert.equal(newObj_02.address.line1, 'string:NULL', '21')
			assert.equal(newObj_02.address.line2, 'string:NULL', '22')
			assert.equal(newObj_02.address.postcode, 'string:NULL', '23')
			assert.equal(newObj_02.address._isNull, true, '24')
			assert.equal(newObj_02.friends.length, 2, '25')
			assert.equal(newObj_02.friends[0]._isNull, false, '26')
			assert.equal(newObj_02.friends[0].name, 'string:Brendan', '27')
			assert.equal(newObj_02.friends[0].age, 30, '28')
			assert.equal(newObj_02.friends[0].dob, '1988-07-23T14:00:00.000Z', '29')
			assert.equal(newObj_02.friends[0].married, true, '30')
			assert.equal(newObj_02.friends[1]._isNull, false, '31')
			assert.equal(newObj_02.friends[1].name, 'string:Boris', '32')
			assert.equal(newObj_02.friends[1].age, -1, '33')
			assert.equal(newObj_02.friends[1].dob, '1970-01-01T00:00:00.000Z', '34')
			assert.equal(newObj_02.friends[1].married, false, '35')
			assert.equal(newObj_02.tags.length, 2, '36')
			assert.equal(newObj_02.tags[0], 'string:banana', '37')
			assert.equal(newObj_02.tags[1], 'string:123', '38')
			assert.equal(newObj_01.note, 'string:NULL', '38_B')

			const obj_03 = {
				id: '123',
				firstName: '',
				lastName: 'Dao',
				age: 0,
				friends: {
					name: 'Brendan',
					age: 30,
					dob: new Date(1988,6,24),
					married: 'true'
				},
				tags:['banana', 123],
				note: new Date(1988,6,24)
			}
			const newObj_03 = fitToSchema(obj_03, schema)
			assert.equal(newObj_03.id, 123, '39')
			assert.equal(newObj_03.firstName, 'string:NULL', '40')
			assert.isNotOk(newObj_03.lastName, '41')
			assert.equal(newObj_03.age, 0, '42')
			assert.equal(newObj_03.address.line1, 'string:NULL', '43')
			assert.equal(newObj_03.address.line2, 'string:NULL', '44')
			assert.equal(newObj_03.address.postcode, 'string:NULL', '45')
			assert.equal(newObj_03.address._isNull, true, '46')
			assert.equal(newObj_03.friends.length, 1, '47')
			assert.equal(newObj_03.friends[0]._isNull, false, '48')
			assert.equal(newObj_03.friends[0].name, 'string:Brendan', '49')
			assert.equal(newObj_03.friends[0].age, 30, '50')
			assert.equal(newObj_03.friends[0].dob, '1988-07-23T14:00:00.000Z', '51')
			assert.equal(newObj_03.friends[0].married, true, '52')
			assert.equal(newObj_03.tags.length, 2, '53')
			assert.equal(newObj_03.tags[0], 'string:banana', '54')
			assert.equal(newObj_03.tags[1], 'string:123', '55')
			assert.equal(newObj_03.note, 'string:1988-07-23T14:00:00.000Z', '55_B')
		})
	})
})