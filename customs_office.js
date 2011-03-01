var m = require('./models.js'),
	Cookies = require('cookies'),
	fs = require('fs'),
	conf = JSON.parse(fs.readFileSync('./8081.conf')),
	http = require('http'),
	log = require('./logger.js').customs;

var noop = function(){}

var cookieOptions = function(){
	return {
		'expires': new Date(Date.now()+4*365*24*3600*1000),
		'path': '/',
		'domain': conf.server.fqdn		
	}
}

this.check = function(req,res,callback){
	var cookiejar = new Cookies(req,res);
	var client_id = cookiejar.get('client_id')
	var key = cookiejar.get('key');
	
	if(client_id && key)
		m.clients.get(client_id,key,function(client){
	
			if(client){
				log('checkin (' + client.client_id + ')')
				setCookies(cookiejar,client)
				callback(client);
			}
			else{
				m.clients.create(function(client){
					log('created (' + client.client_id + ')')
					setCookies(cookiejar,client)
					callback(client);
				})
			}
		})
	else
		m.clients.create(function(client){
			log('created (' + client.client_id + ')')
			setCookies(cookiejar,client)
			callback(client);
		})
}

var setCookies = function(cookiejar,client){
	cookiejar.set('client_id',client.client_id,cookieOptions());
	cookiejar.set('key',client.key,cookieOptions());
}

/*
var customs = this;

http.createServer(function(req,res){
	customs.check(req,res,function(client){
	
	});
}).listen(8081);
*/
