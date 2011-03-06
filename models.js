var fs = require('fs'),
	conf = JSON.parse(fs.readFileSync('./8081.conf')),
	Client = require('mysql').Client,
    client = new Client(conf.db),
    log = require('./logger.js').db;
    
require('joose')
require('joosex-namespace-depended')
require('hash')

var noop = function(){};

var convertTime = function(object,timekeys){
	for(var i in timekeys)
		object[timekeys[i]] = new Date(object[timekeys[i]] * 1000)
}

var randomSha = function(){
	var rnd = '' + Math.random();
	var hash =  Hash.sha1(rnd)
	return hash;
}

var keyvalstring = function(object,separator){
	separator = separator || ','
	var query = '';
	for ( var key in object){
		query += '`'+key+'` = ';
		var val = object[key];
		if(val instanceof Date) query += val.getTime()/1000;
		else query+=client.escape(object[key]);
		query += separator+' ';
	}
	return query.substr(0,query.length-separator.length-1);
}

client.insert = function(table,object,callback){
	var query = 'INSERT INTO `' + table + '` SET ' + keyvalstring(object)
	log(query);
	client.query(query,function(err,info){
		if (err) throw err;
		(callback || noop)(info.insertId)
	})
}

client.update = function(table,condition,object,callback){
	var query = 'UPDATE `' + table + '` SET ' + keyvalstring (object) + ' WHERE ' + keyvalstring(condition)
	log(query);
	client.query(query,function(err,info){
		if (err) throw err;
		(callback || noop)()
	})
}

client.connect();

this.files = {
	create: function(filename,filesize,callback){
		if(!(matches= filename.match(/^([a-zA-Z0-9_]+)_([0-9]+).([0-9]+).([0-9]+)_([0-9]+)-([0-9]+)_([a-z0-9]+)_(\d+)_TVOON_DE\.mpg(((\.avi)|(\.otrkey)|(\.cut)|(\.HD)|(\.mp4)|(\.HQ)|(\.ac3))+)$/))) return null;
		
		var file={
			filename: filename,
			title: matches[1].replace(/\_/g," "),
			start: new Date('20'+matches[2],matches[3],matches[4],matches[5],matches[6]),
			station: matches[7],
			duration: matches[8],
			present: true,
			filesize: filesize
		};
		
		var split = matches[9].split('.');
			for (var i in split)
				if(split[i].length>0)
					file[split[i]] = true;
		client.insert('files',file,function(insertId){
			file.file_id = insertId;
			(callback || noop)(file);
		})
	},
	update: function(file,callback){
		client.update('files',{'file_id':file.file_id},file,function(){(callback || noop)(file)});
	},
	get: function(filename,callback){
		var query = 'SELECT * FROM `files` WHERE `filename` = ' + client.escape(filename);
		log(query);
		client.query(query,function(err,results){
			if(results && results.length>0){
				convertTime(results[0],['start']);
				(callback || noop)(results[0]);
			}
			else
				(callback || noop)(null);
		})
	},

	dropall: function(callback){
		var query = 'UPDATE `files` SET present = 0'
		log(query);
		client.query(query,function(err,results){
			if (err) throw err;
			callback();
		})
	},
	available: function(callback){
		var query = 'SELECT * FROM `files` WHERE `present` = 1 ORDER BY start DESC';
		log(query);
		client.query(query,function(err,results){
			if(err) throw err;
			if(results){
				for (var i in results)
					convertTime(results[i],['start']);
				(callback || noop)(results);
			}
			else
				(callback || noop)(null);
		})
	}
}

this.tickets = {
	create: function(file,c,callback){
		var ticket = {file: file.file_id, created: Date.now()/1000, client: c.client_id, hash: randomSha()}
		client.insert('tickets',ticket,(function(insertId){
			ticket.ticket_id = insertId
			callback(ticket)
		}).bind(this))
	},
	update: function(ticket, callback){
		client.update('tickets',{'ticket_id':ticket.ticket_id},ticket,function(){(callback || noop)(ticket)})
	},
	join: function(ticket_id, callback){
		var query = 'SELECT * FROM `tickets` LEFT JOIN (files) on (files.file_id = tickets.file) WHERE `ticket_id` = ' + client.escape(ticket_id) + ' AND files.present = true'
		log(query);
		client.query(query,function(err,results){
			if(err) throw err;
			if(results && results.length>0){
				convertTime(results[0],['created', 'start']);
				(callback || noop)(results[0])
			}
			else
				(callback || noop)(null);
		})
	},
	activateNext: function(number,callback){
		var query = 'UPDATE `tickets` SET `active` = 1 WHERE `active` = 0 ORDER BY `created` ASC LIMIT ' + number
		log(query);
		client.query(query,function(err,info){ 
			if(err) throw err;
			(callback || noop)(info.affectedRows)
		});
	},
	qlen: function(callback){
		var query = 'SELECT COUNT(*) AS c FROM `tickets` WHERE active = false'
		log(query)
		client.query(query,function(err,results){
			if(err) throw err;
			if(results && results.length>0){
				(callback || noop)(results[0]['c'])
			}
			else
				(callback || noop)(0);		
		})
	},
	firstInQ: function(callback){
		var query = 'SELECT * FROM `tickets` WHERE active = false ORDER BY `ticket_id` ASC LIMIT 1'
		log(query)
		client.query(query,function(err,results){
			if(err) throw err;
			if(results && results.length>0){
				convertTime(results[0],['created', 'start']);
				(callback || noop)(results[0])
			}
			else
				(callback || noop)(null);
		})
	}
};

this.clients = {
	create: function(callback){
		var c = {key: randomSha(),birth: Date.now()/1000};
		client.insert('clients',c,function(insertId){
			c.client_id = insertId
			callback(c)
		});
	},
	/*update: function(c,callback){
		client.update('clients',{'client_id':c.client_id},c,function(){(callback || noop)(c)})
	},*/
	get: function(client_id, key,callback){
		var query = 'SELECT * FROM `clients` WHERE ' + keyvalstring({key: key, client_id:client_id},'AND')
		log(query)
		client.query(query,function(err,results){
			if(err) throw err;
			if(results && results.length>0){
				convertTime(results[0],['birth']);
				(callback || noop)(results[0]);
			}
			else{
				(callback || noop)(null);
			}
		})
	},
	join: function(c, callback){
		var query = 'SELECT * FROM `clients` JOIN (tickets,files) ON (clients.client_id = tickets.client AND tickets.file = files.file_id) WHERE '
			+'files.present = true AND `client_id` = ' + client.escape(c.client_id);
		log(query)
		client.query(query,function(err,results){
			if(err) throw err;
			if(results && results.length>0){
				for (var i in results){
					convertTime(results[i],['created', 'start','birth'])
				}
				(callback || noop)(results)
			}
			else{
				(callback || noop)(null)
			}
		})
	},
	getFileTicket: function(c,filename,callback){
		var query = 'SELECT tickets.* FROM `clients` JOIN (tickets,files) ON (clients.client_id = tickets.client AND tickets.file = files.file_id) WHERE files.present = true and files.filename = ' + client.escape(filename) 
			+' and clients.client_id = ' + client.escape(c.client_id)
		log(query);
		client.query(query,function(err,results){
			if(err) throw err;
			if(results && results.length>0){
				convertTime(results[0],['created']);
				(callback || noop)(results[0])
			}
			else
				(callback || noop)(null);
		})
	}
}
