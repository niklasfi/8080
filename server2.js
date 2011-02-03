var http = require('http');
var fs   = require('fs');
var url  = require('url');

var thankyou = require('./templates/thankyou.html.js');

var settingsPath='settings2.json';

var Ticket = function(Server, filename){
	while(this.id==null || Server.tickets.all[this.ID]!=null) 
		this.id=Math.floor(Math.random() * (100000000 + 1));
	this.created = Date.now();
	this.filename = filename;
	this.ready = false;
}

var Server = function(path){
	this.readSettings(path);
}

Server.prototype.readSettings = function(path){
	fs.readFile(path, 'utf8', function(err,data){
		if(err) throw err;
		Server.prototype.parseSettings(data);
	})
}

Server.prototype.parseSettings = function(data){
	this.options=JSON.parse(data);
	if(!this.options.downloadPath) throw new Error('downloadPath is not set in settings file');
	if(this.options.downloadPath.substring(this.options.downloadPath.length-1,1)!='/') this.options.downloadPath+'/';
	this.createServer();
	this.findFiles();

}

Server.prototype.createServer = function(){
	this.http = http.createServer(this.onRequest.bind(this)).listen(this.options.port);
	this.tickets = {q: [], all: {}};
	this.totalTraffic = 0;
	this.trafficMonitor = setInterval(this.statsTick.bind(this),1000);
}

Server.prototype.findFiles = function(){
	fs.readdir(this.options.downloadPath,(function(err,files){
		if(err) throw err;
		
		console.log('files found:');
		this.files={};
		for(var i in files){
			this.addFile(this,files[i]);
		}
	}).bind(this))
}
Server.prototype.addFile = function(that,filename){
	this.files[filename]={filename: filename, status: 'pre-stat'};
	fs.stat(this.options.downloadPath+filename, (function(err, stats){
		console.log('\t'+filename);
		if(err) throw err;
		this.files[filename].size=stats.size;
		this.files[filename].status='ready';
	}).bind(this));
}

Server.prototype.onRequest = function(req,res){
	var u = url.parse(req.url)
	var matches;	
	if(u.pathname == "/" || u.pathname.match(/^\/index\/?/i))
		this.showIndex(req,res);
	else if(matches=u.pathname.match(/^\/createticketfor\/([a-zA-Z0-9_.-]+)/i))
		this.createTicket(req,res,matches);
	else if(matches=u.pathname.match(/^\/download\/([0-9]+)\/?/i))
		this.download(req,res,matches);
	else if(u.pathname.match(/^\/thankyou\/?/i))
		this.showTemplate(res,req,thankyou.text);
	else{
		res.writeHead(200,{});
		res.write(req.url+"\n");
		res.end(JSON.stringify(url.parse(req.url)));
	}
}

Server.prototype.showIndex = function(req,res){
	res.writeHead(200,{'Content-Type': 'text/html; charset=utf-8'});
	res.write('<http><head><link rel="stylesheet" type="text/css" href="style.css"></head><body><h1>OTR-Mirror</h1><ul>\n')
	for(var i in this.files){
		res.write('\t<li><a href="/createTicketFor/' + i + '">'+i+'</a></li>\n');
	}
	res.end('</ul></html>');
}

Server.prototype.showTemplate = function(res,req,textfnc){
	res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
	res.end(textfnc());
}

Server.prototype.createTicket = function(req,res,matches){
	var filename=matches[1];
	if(filename in this.files){
		var t = new Ticket(this, filename)
		this.tickets.all[t.id]=t;

		this.tickets.q.push(t);
		res.writeHead(302, {location: '/download/' + t.id});
		res.end();
	}
	else{
		res.writeHead(404, {'Content-Type': 'text/html; charset=utf-8'});
		res.write('<h1>file not found</h1><p>available files:</p><ul>')
		for (var f in this.files){
			res.write("<li>"+f+"</li>\n");
		}
		res.end("</ul></html>");
	}
}

Server.prototype.download = function(req,res,matches){
	var ticket=this.tickets.all[matches[1]];
	if(ticket){
		if(ticket.res){
			res.writeHead(403)
			res.end('you have already opened a connection for this ticket');
		}
		else{
			if(req.headers.range){
				var ranges=req.headers.range.match(/^bytes=([0-9]*)-([0-9]*)/)
				ticket.start=parseInt(ranges[1]) || 0;
				ticket.end=parseInt(ranges[2]) || this.files[ticket.filename].size-1;
			}
			if(!ticket.end || ticket.start<=ticket.end){
				var options = {'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename='+ticket.filename, 'Content-Length': this.files[ticket.filename].size};
				if(ticket.end){
					options['Content-Range'] = 'bytes ' + ticket.start + '-' + ticket.end + '/' + this.files[ticket.filename].size;
				}
				res.writeHead(200,options);
	
				ticket.res=res;
		
				if(ticket.ready) this.sendfile(ticket);
			}
			else{
				res.writeHead(416);
				res.end('requested range not satisfiable');
			}
		}
	}
	else{
		res.writeHead(404);
		res.end('file not found');
	}
}

Server.prototype.sendfile = function(ticket){
	ticket.rs = fs.createReadStream(this.options.downloadPath+ticket.filename,{start: ticket.start, end: ticket.end});
	ticket.rs.pipe(ticket.res);
}

Server.prototype.statsTick = function(){
	if (this.tickets.q.length > 0 && this.totalTraffic < (this.options.maintainTraffic || Number.POSITIVE_INFINITY) ){
		var t = this.tickets.q.shift();
		t.ready = true;
		if( t.res ){
			this.sendfile(t);
		}
	}
	this.totalTraffic = 0;
}

var s=new Server(settingsPath);
