const crawlJobStats = {
	size: 'integer',
	count: 'integer',
	found: 'integer',
	notFound: 'integer'
} 

const crawlJobImgStats = Object.assign({ 
	clusters: [{
		name: 'string',
		count: 'integer',
		avgDim: {
			width: 'integer',
			height: 'integer'
		},
		avgSize: 'integer'
	}] 
}, crawlJobStats)

const crawlJobContentStats = {
	files: crawlJobStats,
	css: crawlJobStats,
	externalLinks: crawlJobStats,
	iframes: crawlJobStats,
	images: crawlJobImgStats,
	js: crawlJobStats,
	pages: crawlJobStats
} 

const url = {
	original: 'string',
	new: 'string'
}

const webContentBase = {
	url: url,
	found: 'boolean'
}

const webContent = Object.assign({
	stats: crawlJobContentStats,
	css: [webContentBase],
	externalLinks: [webContentBase],
	iframes: [webContentBase],
	images: [webContentBase],
	js: [webContentBase],
	pages: [webContentBase],
	created: 'string'
}, webContentBase)

const notFoundWebContent = {
	uri: 'string', 
	type: 'string'
}

const notFound = {
	count: 'integer',
	data: [notFoundWebContent]
}

const crawlJob = {
	id: 'string',
	website: 'string',
	mode: 'string',
	rehostedUri: 'string',
	user: {
		id: 'string',
		email: 'string'
	},
	status: 'string',
	result: {
		stats: crawlJobContentStats,
		css: [webContent],
		iframes: [webContent],
		images: [webContent],
		js: [webContent],
		pages: [webContent],
		notFound: notFound
	},
	created: 'timestamp',
	completed: 'string'
}

module.exports = crawlJob