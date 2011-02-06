var http = require('http');
var fs   = require('fs');
var url  = require('url');

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
	this.files={};
	this.findFiles();
	setInterval((this.findFiles).bind(this),3000);

}

Server.prototype.createServer = function(){
	this.http = http.createServer(this.onRequest.bind(this)).listen(this.options.port);
	this.views = require('./views.js');
	this.tickets = {q: [], all: {}};
	this.totalTraffic=0;
	this.trafficMonitor = setInterval((this.statsTick).bind(this),1000);
	this.ticketCleaner = setInterval((this.cleanTickets).bind(this),24*3600*1000);
}

Server.prototype.cleanTickets = function(){
	var now = Date.now()
	for (var i in this.tickets.all){
		if( (now - this.tickets.all[i].created).milliseconds > 24*3600*1000){
			this.tickets.q[this.tickets.q.indexOf(this.tickets.all[i])]==null;
			delete this.tickets.all[i];
		}
	}
	//we need to improve on the ticket system
	//this function potentially lies in O(n²)
}

Server.prototype.findFiles = function(){
	fs.readdir(this.options.downloadPath,(function(err,files){
		if(err) throw err;

		for(var f in files){
			if(! this.files[files[f]])
				this.addFile(files[f]);
		}
	}).bind(this))
}
Server.prototype.addFile = function(filename){
	fs.stat(this.options.downloadPath+filename, (function(err, stats){
		if(!stats.isFile()) return;
		this.files[filename]={filename: filename, status: 'pre-stat'};
		console.log('+ '+filename);
		if(err) throw err;
		this.files[filename].size=stats.size;
		this.files[filename].status='ready';
		fs.watchFile(this.options.downloadPath+filename, (function(curr,prev){this.onFileChange(filename,curr,prev);}).bind(this));
	}).bind(this));
}

Server.prototype.onFileChange = function(filename,curr,prev){
	if(curr.nlink){

		if(filename in this.files)
			this.files[filename].size = curr.size;
		else
			this.addFile(filename)
	}
	else{
		console.log('- '+filename);
		delete this.files[filename];
	}
}

Server.prototype.onRequest = function(req,res){
	var u = url.parse(req.url)
	var matches;
	if(u.pathname == "/" || u.pathname.match(/^\/index\/?/i))
		this.views.index.bind(this)(req,res);
	else if(matches=u.pathname.match(/^\/createticketfor\/([a-zA-Z0-9_.-]+)/i))
		this.createTicket(req,res,matches);
	else if(matches=u.pathname.match(/^\/download\/([0-9]+)\/?/i))
		this.download(req,res,matches);
	else if(u.pathname.match(/^\/thankyou\/?/i))
		this.sendStatic(res,req, 'thankyou.html');
	else if(u.pathname.match(/^\/style.css\/?/i))
		this.sendStatic(res, req, 'style.css', {'Content-Type': 'text/css'});
	else{
		res.writeHead(404,{'Content-Type': 'text/plain; charset=utf-8'});
		res.end('file not found: '+req.url+"\n");
	}
}

Server.prototype.sendStatic = function(res,req,path,httpOptions){
	res.writeHead(200,httpOptions || {'Content-Type': 'text/html; charset=utf-8'})
	fs.createReadStream('./static/'+path).pipe(res)
}

Server.prototype.showTemplate = function(res,req,textfnc,mimeType){
	res.writeHead(200, {'Content-Type': mimeType || 'text/html; charset=utf-8'});
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
			if(! (ticket.filename in this.files)){ //datei wurde in der Zwischenzeit gelöscht
				res.writeHead(404)
				res.end('file not found');
			}			
			else if(!ticket.end || ticket.start<=ticket.end){
				var options = {'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename='+ticket.filename, 'Content-Length': this.files[ticket.filename].size};
				if(ticket.end){
					options['Content-Range'] = 'bytes ' + ticket.start + '-' + ticket.end + '/' + this.files[ticket.filename].size;
				}
				res.writeHead(200,options);
	
				ticket.res=res;
		
				if(ticket.ready) this.pushDownload(ticket);
			}
			else{
				res.writeHead(416);
				res.end('requested range not satisfiable');
			}
		}
		req.socket.on('close',(function(){this.onSocketClose(ticket)}).bind(this))
	}
	else{
		res.writeHead(404);
		res.end('file not found');
	}

}

Server.prototype.pushDownload = function(ticket){
	if(ticket.filename in this.files){
		ticket.rs = fs.createReadStream(this.options.downloadPath+ticket.filename,{start: ticket.start, end: ticket.end});
		ticket.rs.pipe(ticket.res);
		ticket.rs.on('data', (function(chunk){this.totalTraffic+=chunk.length;}).bind(this));
	}
	else{ //file has been deleted in the mean time
		ticket.res.end();
	}
}

Server.prototype.onSocketClose = function(ticket){
	//ticket.rs.close();
	delete this.tickets.all[ticket.id]
}

Server.prototype.statsTick = function(){
	if (this.tickets.q.length > 0 && this.totalTraffic < (this.options.maintainTraffic || Number.POSITIVE_INFINITY)){
		var t;
 		while(this.tickets.q.length>0 && (null == (t = this.tickets.q.shift()))){} //some entries in tickets may be null due to premature deletion
		if( t ){ // the last item might be null as well
			t.ready = true;
			if( t.res ){
				this.pushDownload(t);
			}
		}
	}
	//console.log(this.totalTraffic);
	this.totalTraffic = 0;
}

var s=new Server(settingsPath);
