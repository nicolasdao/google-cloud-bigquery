# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.4.3](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.4.2...v0.4.3) (2020-07-16)


### Bug Fixes

* Vulnerabilities ([46119a5](https://github.com/nicolasdao/google-cloud-bigquery/commit/46119a51c386ea1b3e1fbc00f37320d8b92c1dae))

<a name="0.4.2"></a>
## [0.4.2](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.4.1...v0.4.2) (2019-02-16)



<a name="0.4.1"></a>
## [0.4.1](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.4.0...v0.4.1) (2019-02-16)


### Bug Fixes

* Missing error message for bad queries + incorrect type casting when number string are passed to queries ([0b4541d](https://github.com/nicolasdao/google-cloud-bigquery/commit/0b4541d))



<a name="0.4.0"></a>
# [0.4.0](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.3.2...v0.4.0) (2019-02-07)


### Features

* Add support for reliable safe mode for insert of big number of rows at once ([6707029](https://github.com/nicolasdao/google-cloud-bigquery/commit/6707029))



<a name="0.3.2"></a>
## [0.3.2](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.3.1...v0.3.2) (2019-02-07)


### Bug Fixes

* Inserts that exceed the streaming insert quotas limit do not throw any errors ([9f9d664](https://github.com/nicolasdao/google-cloud-bigquery/commit/9f9d664))



<a name="0.3.1"></a>
## [0.3.1](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.3.0...v0.3.1) (2018-12-10)


### Features

* Throw errors if bad http status ([a838c3c](https://github.com/nicolasdao/google-cloud-bigquery/commit/a838c3c))



<a name="0.3.0"></a>
# [0.3.0](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.2.11...v0.3.0) (2018-12-10)


### Features

* Improve the robusness with retry mechanism ([d8c9a43](https://github.com/nicolasdao/google-cloud-bigquery/commit/d8c9a43))



<a name="0.2.11"></a>
## [0.2.11](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.2.10...v0.2.11) (2018-12-10)



<a name="0.2.10"></a>
## [0.2.10](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.2.9...v0.2.10) (2018-12-10)


### Features

* Add support for safeMode when inserting huge amount of rows ([579c959](https://github.com/nicolasdao/google-cloud-bigquery/commit/579c959))



<a name="0.2.9"></a>
## [0.2.9](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.2.8...v0.2.9) (2018-12-09)



<a name="0.2.8"></a>
## [0.2.8](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.2.7...v0.2.8) (2018-12-09)



<a name="0.2.7"></a>
## [0.2.7](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.2.6...v0.2.7) (2018-12-04)


### Features

* Add support for getting the table and db name straight from the object themselves ([098134c](https://github.com/nicolasdao/google-cloud-bigquery/commit/098134c))



<a name="0.2.6"></a>
## [0.2.6](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.2.5...v0.2.6) (2018-12-03)



<a name="0.2.5"></a>
## [0.2.5](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.2.4...v0.2.5) (2018-12-03)


### Features

* Add support for testing if the schema has changed + update schema ([8b750e7](https://github.com/nicolasdao/google-cloud-bigquery/commit/8b750e7))



<a name="0.2.4"></a>
## [0.2.4](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.2.3...v0.2.4) (2018-11-22)


### Bug Fixes

* undefine exception ([f299c31](https://github.com/nicolasdao/google-cloud-bigquery/commit/f299c31))



<a name="0.2.3"></a>
## [0.2.3](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.2.2...v0.2.3) (2018-11-22)


### Bug Fixes

* Unit test issue due to bad UTC date formatting ([7a3494a](https://github.com/nicolasdao/google-cloud-bigquery/commit/7a3494a))



<a name="0.2.2"></a>
## [0.2.2](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.2.1...v0.2.2) (2018-11-14)


### Bug Fixes

* inserting values with empty array fail when the field type is an array of records ([a255d4b](https://github.com/nicolasdao/google-cloud-bigquery/commit/a255d4b))
* inserting values with empty array fail when the field type is an array of records ([d19fc15](https://github.com/nicolasdao/google-cloud-bigquery/commit/d19fc15))



<a name="0.2.1"></a>
## [0.2.1](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.2.0...v0.2.1) (2018-11-14)


### Features

* Add support for forcing the insert payload to follow a specific schema before the insert ([41c0a1f](https://github.com/nicolasdao/google-cloud-bigquery/commit/41c0a1f))



<a name="0.2.0"></a>
# [0.2.0](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.1.5...v0.2.0) (2018-11-14)


### Features

* Add support for testing if table and DB exists + create table with schema + insert data ([2ede7e9](https://github.com/nicolasdao/google-cloud-bigquery/commit/2ede7e9))



<a name="0.1.5"></a>
## [0.1.5](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.1.4...v0.1.5) (2018-11-12)


### Features

* Add support for 'timestamp' type in table schema def in the 'fitToSchema' function ([e45db9c](https://github.com/nicolasdao/google-cloud-bigquery/commit/e45db9c))



<a name="0.1.4"></a>
## [0.1.4](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.1.2...v0.1.4) (2018-11-12)


### Bug Fixes

* Loading data to BigQuery table does not ignore bad data ([6e5d32d](https://github.com/nicolasdao/google-cloud-bigquery/commit/6e5d32d))



<a name="0.1.2"></a>
## [0.1.2](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.1.1...v0.1.2) (2018-11-12)


### Bug Fixes

* The string type does not always yield a string type once loaded to a BigQuery table ([84d755a](https://github.com/nicolasdao/google-cloud-bigquery/commit/84d755a))



<a name="0.1.1"></a>
## [0.1.1](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.1.0...v0.1.1) (2018-11-12)


### Features

* Add support for formatting an object to a specific table schema ([0eefad1](https://github.com/nicolasdao/google-cloud-bigquery/commit/0eefad1))



<a name="0.1.0"></a>
# [0.1.0](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.0.3...v0.1.0) (2018-11-11)


### Features

* Add support for formatting data to make them BigQuery compliant ([a5c2ab7](https://github.com/nicolasdao/google-cloud-bigquery/commit/a5c2ab7))



<a name="0.0.3"></a>
## [0.0.3](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.0.2...v0.0.3) (2018-11-11)



<a name="0.0.2"></a>
## [0.0.2](https://github.com/nicolasdao/google-cloud-bigquery/compare/v0.0.1...v0.0.2) (2018-11-10)



<a name="0.0.1"></a>
## 0.0.1 (2018-11-10)


### Features

* Add support for creating a BigQuery table from Google Cloud Storage ([024fa1c](https://github.com/nicolasdao/google-cloud-bigquery/commit/024fa1c))
