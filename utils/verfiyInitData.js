const crypto = require('crypto');



function validateInitData(initData, BOT_TOKEN) {
	// Parse the query string into key-value pairs
	const parsedData = new URLSearchParams(initData);
	const hash = parsedData.get('hash');
	parsedData.delete('hash');

	// Sort the parameters in alphabetical order
	const sortedParams = [...parsedData.entries()]
		.map(([key, value]) => `${key}=${value}`)
		.sort()
		.join('\n');

	// Compute the secret key
	const secretKey = crypto
		.createHmac('sha256', 'WebAppData')
		.update(BOT_TOKEN)
		.digest();

	// Compute the HMAC SHA-256 hash
	const computedHash = crypto
		.createHmac('sha256', secretKey)
		.update(sortedParams)
		.digest('hex');

	// Compare hashes
	return computedHash === hash;
}


module.exports = validateInitData