# Google Cloud BigQuery &middot;  [![NPM](https://img.shields.io/npm/v/google-cloud-bigquery.svg?style=flat)](https://www.npmjs.com/package/google-cloud-bigquery) [![Tests](https://travis-ci.org/nicolasdao/google-cloud-bigquery.svg?branch=master)](https://travis-ci.org/nicolasdao/google-cloud-bigquery) [![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause) [![Neap](https://neap.co/img/made_by_neap.svg)](#this-is-what-we-re-up-to)
__*Google Cloud BigQuery*__ is node.js package to create BigQuery table from Google Cloud Storage or load data into Google Cloud BigQuery tables including automatically updating the tables' schema.

# Table of Contents

> * [Install](#install) 
> * [How To Use It](#how-to-use-it) 
> * [About Neap](#this-is-what-we-re-up-to)
> * [License](#license)


# Install
```
npm i google-cloud-bigquery --save
```

# How To Use It

## Prerequisite

Before using this package, you must first:

1. Have a Google Cloud Account.

2. Have a both a BigQuery DB and a Bucket in the same region.

3. Have a Service Account set up with the following 2 roles:
	- `roles/storage.objectAdmin`
	- `roles/bigquery.admin`

4. Get the JSON keys file for that Service Account above

5. Save that JSON key into a `service-account.json` file. Make sure it is located under a path that is accessible to your app (the root folder usually).

## Show Me The Code

```js
const { join } = require('path')
const createClient = require('google-cloud-bigquery')

const client = createClient({
	jsonKeyFile: join(__dirname, './service-account.json')
})

// Load data into an existing BigQuery table. If the JSON objects in the sources contain new properties, those properties 
// will automatically update the BigQuery table's schema
client.table.loadData.fromStorage({
	projectId: 'your-project-id', 
	db: 'your-bigquery-datasetid', 
	table: 'your-existing-table', 
	sources: ['your-bucket/some-path/*', 'another-bucket/a-path/specific-file.json']
})
.then(res => {
	console.log('YES')
	console.log(JSON.stringify(res, null, ' '))
	return client.job.get(res.data.jobReference).then(res => {
		console.log('INFO ABOUT THE JOB:')
		console.log(JSON.stringify(res, null, ' '))
	})
})
.catch(err => {
	console.log('NO')
	console.log(`${err.message}\n${err.stack}`)
})

// Create a new BigQuery table using the data located in the sources.
client.table.create.fromStorage({
	projectId: 'your-project-id', 
	db: 'your-bigquery-datasetid', 
	table: 'your-new-existing-table', 
	sources: ['your-bucket/some-path/*', 'another-bucket/a-path/specific-file.json']
})
.then(res => {
	console.log('YES')
	console.log(JSON.stringify(res, null, ' '))
	return client.job.get(res.data.jobReference).then(res => {
		console.log('INFO ABOUT THE JOB:')
		console.log(JSON.stringify(res, null, ' '))
	})
})
.catch(err => {
	console.log('NO')
	console.log(`${err.message}\n${err.stack}`)
})
```

> Notice the usage of the `client.job.get` to check the status of the job. The signature of that api is as follow:
>	`client.job.get({ projectId: 'your-project-id', location: 'asia-northeast1', jobId: 'a-job-id' })`

# This Is What We re Up To
We are Neap, an Australian Technology consultancy powering the startup ecosystem in Sydney. We simply love building Tech and also meeting new people, so don't hesitate to connect with us at [https://neap.co](https://neap.co).

Our other open-sourced projects:
#### GraphQL
* [__*graphql-serverless*__](https://github.com/nicolasdao/graphql-serverless): GraphQL (incl. a GraphiQL interface) middleware for [webfunc](https://github.com/nicolasdao/webfunc).
* [__*schemaglue*__](https://github.com/nicolasdao/schemaglue): Naturally breaks down your monolithic graphql schema into bits and pieces and then glue them back together.
* [__*graphql-s2s*__](https://github.com/nicolasdao/graphql-s2s): Add GraphQL Schema support for type inheritance, generic typing, metadata decoration. Transpile the enriched GraphQL string schema into the standard string schema understood by graphql.js and the Apollo server client.
* [__*graphql-authorize*__](https://github.com/nicolasdao/graphql-authorize.git): Authorization middleware for [graphql-serverless](https://github.com/nicolasdao/graphql-serverless). Add inline authorization straight into your GraphQl schema to restrict access to certain fields based on your user's rights.

#### React & React Native
* [__*react-native-game-engine*__](https://github.com/bberak/react-native-game-engine): A lightweight game engine for react native.
* [__*react-native-game-engine-handbook*__](https://github.com/bberak/react-native-game-engine-handbook): A React Native app showcasing some examples using react-native-game-engine.

#### Tools
* [__*aws-cloudwatch-logger*__](https://github.com/nicolasdao/aws-cloudwatch-logger): Promise based logger for AWS CloudWatch LogStream.

# License
Copyright (c) 2018, Neap Pty Ltd.
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
* Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
* Neither the name of Neap Pty Ltd nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL NEAP PTY LTD BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

<p align="center"><a href="https://neap.co" target="_blank"><img src="https://neap.co/img/neap_color_horizontal.png" alt="Neap Pty Ltd logo" title="Neap" height="89" width="200"/></a></p>