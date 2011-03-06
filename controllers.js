var m = require('./models.js');
var v = require('./views.js');
var tc = require('./traffic_control');

this.index = function(req,res,matches){
	var filename = (matches && matches[2]) || req.parsedUrl.query.file;
	if(filename)
		m.files.get(filename,function(file){
			if(file && file.present)
				v.index(req,res,[file])
			else
				v.send404(req,res);
		})
	else
		m.files.available(function(files){
			v.index(req,res,files);
		})
}

this.createTicket = function(req,res,client,matches){
	var filename = matches[1];
	
	m.clients.getFileTicket(client,filename,function(ticket){
	console.log(ticket);
	if(ticket){
		if(ticket.active){
			console.log('red to download');
			v.redirect(req,res,'/download/' + ticket.ticket_id + '/' + ticket.hash + '/' + filename)
		}
		else
			v.redirect(req,res,'/queue/');
	}
	else
		m.files.get(filename,function(file){
			if(file && file.present)
				m.tickets.create(file,client,function(ticket){
					if(tc.light()){
						ticket.active = true
						m.tickets.update(ticket,function(){
							v.redirect(req,res,'/download/' + ticket.ticket_id + '/' + ticket.hash + '/' + file.filename)
						});
					}
					else{
						v.redirect(req,res,'/queue/');
					}
				})
			else{
				console.log('404')
				v.send404(req,res);
			}
		})
	
	})
}

this.download = function(req,res,matches){
	var ticket_id = matches[1];
	var hash = matches[2];
	m.tickets.join(ticket_id,function(ticket){
		if(ticket){
			var options={'X-Accel-Redirect':'/nginx/' + ticket.filename, 'Content-Disposition': 'attachment; filename="' + ticket.filename +'"', 'Content-Type': 'application/octet-stream'}
			//options['X-Accel-Limit-Rate'] = ticket.active ? conf.traffic.highSpeedDownloadSpeed : conf.traffic.lowSpeedDownloadSpeed
			if(!ticket.active) options['X-Accel-Limit-Rate'] = conf.traffic.lowSpeedDownloadSpeed
			res.writeHead(200,options)
			res.end('send!');
		}
		else{
			v.send404(req,res);
		}
	})
}

this.queue = function(req,res,client){
	m.clients.join(client,function(rows){
		m.tickets.firstInQ(function(first){
			for(var key in rows){
				rows[key].position = (first && !rows[key].active) ? rows[key].ticket_id - first.ticket_id +1: 'bereit';
			}
			v.queue(req,res,rows);
		});
	})
}

this.clientInfo = function(req,res,client){
	m.clients.join(client,function(rows){
		m.tickets.firstInQ(function(first){
			var tosend={};
			for(var i in rows){
				var r = rows[i]
				tosend[r.ticket_id] = {filename: r.filename, position: (first && !r.active ? r.ticket_id - first.ticket_id +1: 'bereit'), hash: r.hash, active: r.active}
			}
			v.sendJSON(req,res,tosend);
		})
	})
}

this.linklist = function(req,res,matches){
	m.files.available(function(files){
		m.tickets.qlen(function(qlen){
			var qlsi = conf.traffic.queueLengthSpeedIndication;
			var state;
			if( qlsi[0] >= qlen)
				state = 0;
			else if ( qlsi[1] >= qlen)
				state = 1;
			else if ( qlsi[2] >= qlen)
				state = 2;
			else
				state = 3;
			v.linklist(req,res,files,state,matches);
		})	
	})
}
