var http = require('http'),
	fs = require('fs'),
	url = require('url'),
	conf = JSON.parse(fs.readFileSync('./8081.conf')),
	log = require('./logger.js').server;
	m = require('./models.js'),
	v = require('./views.js'),
	c = require('./controllers.js'),
	watchdog = require('./watchdog.js'),
	customs = require('./customs_office.js'),
	traffic = require('./traffic_control.js');

watchdog.fetch();

http.createServer(function(req,res){
	var u = url.parse(req.url,true)
	
	log(req.url);
		
	req.parsedUrl = u

	if(u.pathname.match(/^\/thankyou\/?/i))
		v.sendStatic(req,res, 'thankyou.html');
	else if(u.pathname.match(/^\/faq\/?/i))
		v.sendStatic(req,res,'faq.html');
	else if(u.pathname.match(/^\/imprint\/?/i))
		v.sendStatic(req,res, 'imprint.html');		
	else if(u.pathname.match(/^\/style.css\/?/i))
		v.sendStatic(req, res, conf.server.cssfile);
	else if(matches=u.pathname.match(/.*(jpg|png|ico)/i))
		v.sendStatic(req, res, u.pathname);
	else if(matches=u.pathname.match(/jquery.js/i))
		v.sendStatic(req, res, 'jquery-1.5.1.min.js');
	else if(matches=u.pathname.match(/qrefresh.js/i))
		v.sendStatic(req, res, 'qrefresh.js');
	else if(matches = u.pathname.match(/^\/linklist(\/([a-zA-Z0-9.-]*)\/?)?/i))
		c.linklist(req,res,matches);
	else if(u.pathname == "/" || (matches = u.pathname.match(/^\/index(\/([a-zA-Z0-9_.-]*)\/?)?$/i)))
		c.index(req,res,matches);
	else if(matches=u.pathname.match(/^\/download\/([0-9]+)\/([a-z0-9])?/i))
		c.download(req,res,matches);
	else{
		customs.check(req,res,function(client){
			var matches;

			if(matches=u.pathname.match(/^\/createticketfor\/([a-zA-Z0-9_.-]+)/i))
				c.createTicket(req,res,client,matches);
			else if(matches = u.pathname.match(/^\/queue/))
				c.queue(req,res,client);
			else if(matches = u.pathname.match(/^\/clientInfo/))
				c.clientInfo(req,res,client);
			else{
				v.send404(req,res);
			}
		});
	}
}).listen(conf.server.port,'127.0.0.1');

console.log('server running on ' +  conf.server.port);

traffic.start();
