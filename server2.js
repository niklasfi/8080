var http = require('http');
var fs   = require('fs');
var url  = require('url');
var TicketQ = require('./ticketq.js');

var settingsPath='settings2.json';



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
	
	this.options.cssName = this.options.cssName || 'bauerj.css';
	if(this.options.cssName.substring(this.options.cssName.length-1,1)!='/') this.options.cssName
	
	if(this.options.redirectHost)
		this.options.redirectLocation = 'http://' + this.options.redirectHost;
	else
		this.options.redirectLocation = ''	
	
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
	if(u.pathname == "/" || (matches = u.pathname.match(/^\/index(\/([a-zA-Z0-9_.-]*)\/?)?$/i)))
		(this.views.index).bind(this)(req,res,matches);
	else if(matches=u.pathname.match(/^\/createticketfor\/([a-zA-Z0-9_.-]+)/i))
		this.createTicket(req,res,matches);
	else if(matches=u.pathname.match(/^\/download\/([0-9]+)\/?/i))
		this.download(req,res,matches);
	else if(u.pathname.match(/^\/thankyou\/?/i))
		this.sendStatic(res,req, 'thankyou.html');
	else if(u.pathname.match(/^\/style.css\/?/i))
		this.sendStatic(res, req, this.options.cssName, {'Content-Type': 'text/css'});
	else if(u.pathname == '/linklist/')
		(this.views.linklist).bind(this)(req,res);
	else{
		this.views.send404(req,res);
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
		res.writeHead(302, {location: this.options.redirectLocation+'/download/' + t.id});
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
			console.log(1);
		}
		else{
			if(req.headers.range){
				var range=req.headers.range.match(/^bytes=([0-9]*)-([0-9]*)/)
				ticket.range.start=parseInt(range[1]) || 0;
				ticket.range.end=parseInt(range[2]) || this.files[ticket.filename].size-1;
			}
			if(! (ticket.filename in this.files)){ //datei wurde in der Zwischenzeit gelöscht
				console.log('404 gelöscht');
				res.writeHead(404)
				console.log(2);
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
		console.log(3);
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
	//this.ticketq.removeId(ticket.id);
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
