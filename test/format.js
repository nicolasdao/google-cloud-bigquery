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
const { cleanData } = require('../src/format')

describe('format', () => 
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
	}))