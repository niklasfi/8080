var http = require('http');
var fs   = require('fs');
var url  = require('url');
var TicketQ = require('./ticketq.js');
var spawn = require('child_process').spawn;

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
		var matches;
		if(!stats.isFile() || !( matches= filename.match(/^([a-zA-Z0-9_]+)_([0-9]+).([0-9]+).([0-9]+)_([0-9]+)-([0-9]+)_([a-z0-9]+)_(\d+)_TVOON_DE\.mpg(((\.avi)|(\.otrkey)|(\.cut)|(\.HD)|(\.mp4)|(\.HQ)|(\.ac3))+)$/))) return;
		
		//console.log(matches[1].replace(/\_/g,"$"));

		this.files[filename]={filename: filename, status: 'pre-stat',
			title: matches[1].replace(/\_/g," "),
			starttime: new Date(2000+parseInt(matches[2]), parseInt(matches[3]), parseInt(matches[4]), parseInt(matches[5]), parseInt(matches[6])),
			station: matches[7],
			duration: matches[8],
			flags: function(flagstring){
				var split = flagstring.split('.');
				var flags = {};
				for (var i in split){
					if(split[i].length>0)
						flags[split[i]] = true;
				}
				return flags;
			}(matches[9]),
			md5: false
		};
		
		var m = {};
		for (var i in matches)
			m[i.toString()]=matches[i] || "empty";
		
		//console.log(JSON.stringify(m));
		
		//console.log(JSON.stringify(this.files[filename]));
		
		console.log('+ '+filename);
		if(err) throw err;
		this.files[filename].size=stats.size;
		this.files[filename].status='ready';
		fs.watchFile(this.options.downloadPath+filename, (function(curr,prev){this.onFileChange(filename,curr,prev);}).bind(this));
		if(this.options.md5) this.getMd5(filename);
	}).bind(this));
}

Server.prototype.getMd5 = function(filename){
	fs.readFile(this.options.downloadPath+filename+'.md5','utf8',(function(err,sigma){
		if(err) return this.makeMd5(filename)
		var hex = sigma.match(/^[0-9a-f]+/i)[0]
		this.files[filename].md5 = hex;
	}).bind(this))
}

Server.prototype.makeMd5 = function(filename){
	var sigma = '';
	var proc = spawn('md5sum',[this.options.downloadPath+filename])
	proc.stdout.setEncoding('utf8');
	proc.stdout.on('data',function(chunk){
		sigma += chunk;
	});
	proc.on('exit',(function(code,signal){
		if(code != 0) return console.log('md5sum of ' + filename + ' failed, exit code: ' + code);
		var hex = sigma.match(/^[0-9a-f]+/i)[0]
		this.files[filename].md5 = hex;
		fs.writeFile(this.options.downloadPath+filename+'.md5',hex);
	}).bind(this));
}

Server.prototype.onFileChange = function(filename,curr,prev){
	if(curr.nlink){
		if(filename in this.files)
			this.files[filename].size = curr.size;
		else
			this.addFile(filename)
		this.files[filename].md5 = null;
		if(this.options.md5) this.getMd5(filename);
	}
	else{
		console.log('- '+filename);
		delete this.files[filename];
	}
}

Server.prototype.onRequest = function(req,res){
	console.log('onRequest' + req.url);

	var u = url.parse(req.url)
	req.parsedUrl = u
	var matches;
	if(u.pathname == "/" || (matches = u.pathname.match(/^\/index(\/([a-zA-Z0-9_.-]*)\/?)?$/i)))
		(this.views.index).bind(this)(req,res,matches);
	else if(matches=u.pathname.match(/^\/createticketfor\/([a-zA-Z0-9_.-]+)/i))
		this.createTicket(req,res,matches);
	else if(matches=u.pathname.match(/^\/download\/([0-9]+)\/?/i))
		this.download(req,res,matches);
	else if(matches=u.pathname.match(/^\/md5\/([a-zA-Z0-9_.-]*)\/?$/))
		this.sendMd5(req,res,matches);
	else if(u.pathname.match(/^\/thankyou\/?/i))
		this.sendStatic(req,res, 'thankyou.html');
	else if(u.pathname.match(/^\/faq\/?/i))
                this.sendStatic(req,res,'faq.html');
	else if(u.pathname.match(/^\/imprint\/?/i))
                this.sendStatic(req,res, 'imprint.html');
        else if(matches=u.pathname.match(/.*(jpg|png|ico)/i))
		this.sendStatic(req, res, '.'+  u.pathname, {});
	else if(u.pathname.match(/^\/style.css\/?/i))
		this.sendStatic(req, res, this.options.cssName, {'Content-Type': 'text/css'});
	else if(matches = u.pathname.match(/^\/linklist(\/([a-zA-Z0-9.-]*)\/?)?/i))
		(this.views.linklist).bind(this)(req,res,this.determineState(),matches)
	else{
		this.views.send404(req,res);
	}
}

Server.prototype.determineState = function(){
	return Math.floor(this.ticketq.qlen / 10)
}

Server.prototype.sendStatic = function(req,res,path,httpOptions){
	res.writeHead(200,httpOptions || {'Content-Type': 'text/html; charset=utf-8'})
	fs.createReadStream('./static/'+path).pipe(res)
}

Server.prototype.showTemplate = function(req,res,textfnc,mimeType){
	res.writeHead(200, {'Content-Type': mimeType || 'text/html; charset=utf-8'});
	res.end(textfnc());
}

Server.prototype.sendMd5 = function(req,res,matches){
	var f = this.files[matches[1]];
	if(!f || !f.md5) return this.views.send404(req,res)
	res.writeHead(200,{'Content-Type': 'text/plain'})
	res.end(f.md5);
}

Server.prototype.createTicket = function(req,res,matches){
	

	var filename=matches[1];
	if(filename in this.files){
		var t = this.ticketq.append(filename)
		res.writeHead(302, {location: 'http://' + this.options.fqdn+'/download/' + t.id});
		res.end();
		console.log('t ' + this.files[filename].title + ' qlen: ' + this.ticketq.qlen);
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
		if( ! (ticket.filename in this.files) ){
			console.log('404 gelöscht');
			res.writeHead(404)
			res.end('file not found');
			return;
		}
		
		var call = {res: res}
		if(req.headers.range){
			var range=req.headers.range.match(/^bytes=([0-9]*)-([0-9]*)/)
			call.start = parseInt(range[1]) || 0;
			call.end = parseInt(range[2]) || this.files[ticket.filename].size-1;
		}
		
		if( call.end && call.start>call.end){
			res.writeHead(416);
			res.end('requested range not satisfiable');
			return;
		}
		
		var options = {'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename='+ticket.filename, 'Content-Length': this.files[ticket.filename].size};
		if(call.end){
			options['Content-Range'] = 'bytes ' + call.start + '-' + call.end + '/' + this.files[ticket.filename].size;
		}
		if(call.end  && (call.end!=this.files[ticket.filename].size || call.start!= 0) )
			res.writeHead(206,options);
		else{
			res.writeHead(200,options)
		}

		ticket.res.push(call);

		if(ticket.ready) this.pushDownload(ticket);
	}
	else{
		this.views.send404(req,res);
	}
}

Server.prototype.pushDownload = function(ticket){
	if(ticket.filename in this.files){
		var call;
		while( call = ticket.res.pop() ){
			console.log('pushdownload-pop');
			call.rs = fs.createReadStream(this.options.downloadPath+ticket.filename,{start: call.start, end: call.end});
			call.rs.pipe(call.res);
			//call.rs.on('data', (function(chunk){this.totalTraffic+=chunk.length;}).bind(this));
		}
	}
	else{ //file has been deleted in the meantime
		ticket.res.end();
	}
}

Server.prototype.statsTick = function(){
	if (this.ticketq.head!== null && this.totalTraffic < (this.options.maintainTraffic || Number.POSITIVE_INFINITY)){
		var t;
 		while(this.ticketq.head !== null && (null == (t = this.ticketq.shift()))){} //some entries in tickets may be null due to premature deletion
 			console.log('q +')
			if( t ){ // the last item might be null as well
				t.ready = true;
				if( t.res.length>0 ){
					this.pushDownload(t);
				}
		}
	}
	this.totalTraffic = 0;
}

var s=new Server(settingsPath);
