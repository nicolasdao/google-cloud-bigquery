/**
 * Copyright (c) 2018, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const { assert } = require('chai')
const { obj: { same } } = require('../utils')

describe('utils', () => {
	describe('obj', () => {
		describe('#same', () => {
			it('Should determine whether 2 objects are the same.', () => {
				const obj_01 = {
					firstname: 'Nicolas',
					lastname: 'Dao',
					age: 37,
					dob: new Date('1981-10-08'),
					address: {
						street: '1, Buckingham street',
						postcode: 2010,
						city: 'Surry Hills',
						state: 'NSW',
						country: 'Australia'
					},
					friends: ['Boris', 'Brendan'],
					married: true,
					employers: [{
						name: 'Quivers',
						country: 'US',
						joined: new Date('2013-11-01')
					},{
						name: 'Neap',
						country: 'AU',
						joined: new Date('2017-12-01')
					}]
				}
				const obj_02 = {
					lastname: 'Dao',
					firstname: 'Nicolas',
					age: 37,
					dob: new Date('1981-10-08'),
					address: {
						street: '1, Buckingham street',
						postcode: 2010,
						state: 'NSW',
						city: 'Surry Hills',
						country: 'Australia'
					},
					friends: ['Brendan', 'Boris'],
					married: true,
					employers: [{
						joined: new Date('2017-12-01'),
						name: 'Neap',
						country: 'AU',
					}, {
						country: 'US',
						name: 'Quivers',
						joined: new Date('2013-11-01')
					}]
				}

				const obj_03 = {
					lastname: 'Dao',
					firstname: 'Nicolas',
					age: 37,
					dob: new Date('1981-10-08'),
					address: {
						street: '1, Buckingham street',
						postcode: 2010,
						state: 'NSW',
						city: 'Surry Hills'
					},
					friends: ['Brendan', 'Boris'],
					married: true,
					employers: [{
						joined: new Date('2017-12-01'),
						name: 'Neap',
						country: 'AU',
					}, {
						country: 'US',
						name: 'Quivers',
						joined: new Date('2013-11-01')
					}]
				}

				assert.isOk(same(obj_01, obj_02), '01')
				assert.isOk(same(1, 1), '02')
				assert.isOk(same(new Date('2018-11-01'), new Date('2018-11-01')), '03')
				assert.isOk(same(true, true), '04')
				assert.isOk(same('hello world', 'hello world'), '05')
				assert.isOk(same(null, null), '06')
				assert.isNotOk(same(1, 2), '07')
				assert.isNotOk(same(new Date('2018-11-01'), new Date('2017-11-01')), '08')
				assert.isNotOk(same(true, false), '09')
				assert.isNotOk(same('hello world', 'hello nic'), '10')
				assert.isNotOk(same(null, false), '11')
				assert.isNotOk(same(1, 'hello'), '12')
				assert.isNotOk(same(new Date('2018-11-01'), 12), '13')
				assert.isNotOk(same(true, 1), '14')
				assert.isNotOk(same('hello world', 3), '15')
				assert.throws(() => same(obj_01, obj_03, { throwError: true }), Error, 'Differences in property \'address\': Property \'country\' in the first object does not exit in the second','16')
				assert.isOk(same([1,2,3], [1,2,3]), '17')
				assert.isOk(same([3,1,2], [1,2,3]), '18')
				assert.isNotOk(same([3,1,2,4], [1,2,3]), '19')
			})
		})
	})
})