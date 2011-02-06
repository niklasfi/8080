var http = require('http');
var fs   = require('fs');
var url  = require('url');

var settingsPath='settings2.json';

var Ticket = function(TicketQ, filename){
	while(this.id==null || TicketQ.tickets[this.ID]!=null) 
		this.id=Math.floor(Math.random() * (100000000 + 1));
	this.created = Date.now();
	this.skip = false;
	this.filename = filename;
	this.range = {};
	this.ready = false;
	this.next = null;
}


var TicketQ = function(){
	this.head=null;
	this.tail=null;
	this.tickets = {};
	setInterval((this.clean).bind(this),24*3600*1000)
}

TicketQ.prototype.append = function(filename){
	var newTicket = new Ticket(this, filename);
	this.tickets[newTicket.id] = newTicket;
	if(this.head === null) this.head=newTicket; //Q empty, set head;
	else this.tail.next = newTicket; //Q not empty, last object needs to be linked
	return this.tail = newTicket;
}

TicketQ.prototype.shift = function(filename){
	var first=null;
	while (this.head !== null && (first === null || first.skip)){
		first = this.head;
		this.head = this.head.next;
	}
	return first;
}

TicketQ.prototype.removeId = function(id){
	var t = this.tickets[id];
	t.skip = true;
	this.tickets[id]=undefined;
}

TicketQ.prototype.clean = function(){
	var now = Date.now()
	for (var i in this.tickets)
		if( (now - this.tickets[i].created).milliseconds > 24*3600*1000) this.removeId(i);
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
	this.ticketq = new TicketQ();
	this.totalTraffic=0;
	this.trafficMonitor = setInterval((this.statsTick).bind(this),1000);
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
		var t = this.ticketq.append(filename)
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
	
	var ticket=this.ticketq.tickets[matches[1]];
	if(ticket){
		if(ticket.res){
			res.writeHead(403)
			res.end('you have already opened a connection for this ticket');
		}
		else{
			if(req.headers.range){
				var range=req.headers.range.match(/^bytes=([0-9]*)-([0-9]*)/)
				ticket.range.start=parseInt(range[1]) || 0;
				ticket.range.end=parseInt(range[2]) || this.files[ticket.filename].size-1;
			}
			if(! (ticket.filename in this.files)){ //datei wurde in der Zwischenzeit gelöscht
				res.writeHead(404)
				res.end('file not found');
			}			
			else if(!ticket.range.end || ticket.range.start<=ticket.range.end){
				var options = {'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename='+ticket.filename, 'Content-Length': this.files[ticket.filename].size};
				if(ticket.range.end){
					options['Content-Range'] = 'bytes ' + ticket.range.start + '-' + ticket.range.end + '/' + this.files[ticket.filename].size;
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
		ticket.rs = fs.createReadStream(this.options.downloadPath+ticket.filename,{start: ticket.range.start, end: ticket.range.end});
		ticket.rs.pipe(ticket.res);
		ticket.rs.on('data', (function(chunk){this.totalTraffic+=chunk.length;}).bind(this));
	}
	else{ //file has been deleted in the meantime
		ticket.res.end();
	}
}

Server.prototype.onSocketClose = function(ticket){
	//ticket.rs.close();
	this.ticketq.removeId(ticket.id);
}

Server.prototype.statsTick = function(){
	if (this.ticketq.head!== null && this.totalTraffic < (this.options.maintainTraffic || Number.POSITIVE_INFINITY)){
		var t;
 		while(this.ticketq.head !== null && (null == (t = this.ticketq.shift()))){} //some entries in tickets may be null due to premature deletion
		if( t ){ // the last item might be null as well
			t.ready = true;
			if( t.res ){
				this.pushDownload(t);
			}
		}
	}
	this.totalTraffic = 0;
}

var s=new Server(settingsPath);
