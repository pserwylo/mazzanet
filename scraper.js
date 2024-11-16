// This is a template for a Node.js scraper on morph.io (https://morph.io)

var cheerio = require("cheerio");
var request = require("request");
var sqlite3 = require("sqlite3").verbose();

function initDatabase(callback) {
	// Set up sqlite database.
	var db = new sqlite3.Database("data.sqlite");
	db.serialize(function() {
		db.run("CREATE TABLE IF NOT EXISTS message (capcode TEXT, timestamp DATETIME, message TEXT)");
		db.run("CREATE UNIQUE INDEX IF NOT EXISTS message_capcode_uindex ON message (capcode)");
		callback(db);
	});
}

function updateRow(db, capcode, timestamp, message) {
	// Insert some data.
	var statement = db.prepare("INSERT INTO message VALUES (?, ?, ?)");
	statement.run(capcode, timestamp, message);
	statement.finalize();
}

function readRows(db) {
	// Read some data.
	db.each("SELECT rowid AS id, capcode, timestamp, message FROM message", function(err, row) {
		console.log(row.id + "\t" + row.timestamp + "\t" + row.capcode + "\t" + row.message);
	});
}

function readRow(db, capcode, callback) {
	db.get("SELECT rowid as id, capcode, timestamp, message FROM message WHERE capcode = ?", capcode, function(err, row) {
		callback(row);
	})
}

function fetchPage(url, callback) {
	// Use request to read in pages.
	request(url, function (error, response, body) {
		if (error) {
			console.log("Error requesting page: " + error);
			return;
		}

		callback(body);
	});
}

function run(db) {
	// Use request to read in pages.
	fetchPage("https://mazzanet.net.au/cfa/pager-cfa-all.php", function (body) {
		// Use cheerio to find things in the page with css selectors.
		var $ = cheerio.load(body);

		$("table tr").each(function () {
			var capcode = $('td.capcode', this).text().trim();
			var timestamp = $('td.timestamp', this).text().trim();
			var message = $('td:nth-child(3)', this).text().trim();

			if (!capcode) {
				return;
			}

			readRow(db, capcode, function(row) {
				if (row) {
					console.log('Row ' + capcode + ' already exists. Skipping');
				} else {
					console.log('New row ' + capcode + '. Will insert.');
					updateRow(db, capcode, timestamp, message);
				}
			})
		});

		readRows(db);

		db.close();
	});
}

initDatabase(run);
