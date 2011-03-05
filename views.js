var jade = require('jade');
var fs = require('fs');

var _framework = jade.compile(fs.readFileSync('./templates/framework.jade'));
var _index = jade.compile(fs.readFileSync('./templates/mainpage.jade'));
var _faq = jade.compile(fs.readFileSync('./templates/faq.jade'));
var _imprint = jade.compile(fs.readFileSync('./templates/imprint.jade'));
var _queue = jade.compile(fs.readFileSync('./templates/queue.jade'));

var renderFramework = function(req,res,page,content){
	res.writeHead(200,{'Content-Type': 'text/html; charset=utf-8'});
	res.end(_framework({page:page,content:content}));
}

this.index = function(req,res,files){
	renderFramework(req,res,'root',_index({files:files}));
}

this.faq = function(req,res){
	renderFramework(req,res,'faq',_faq());
}

this.imprint = function(req,res){
	renderFramework(req,res,'imprint',_imprint());
}

this.queue = function(req,res,rows){
	renderFramework(req,res,'queue',_queue({rows: rows}));
}

this.linklist = function(req,res, files, state, matches){
	res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});
	var type = matches[2];
	for(i in files)
		switch(type){
			default:
			//case "otr-search":
				res.write(files[i].filename + ' ' + state + "\n");
				break;
			//default :
			//	res.write('http://' + conf.server.fqdn + '/index/'+ files[i].filename + ' ' + state + "\n");
		}
	res.end();
}

this.sendStatic = function(req,res,path){
	res.writeHead(200,{'X-Accel-Redirect':'/static/' + path})
	res.end('send!');
}

this.send404 = function(req,res){
	res.writeHead(404);
	res.end('not found');
}

this.sendJSON = function(req,res,object){
	res.writeHead(200,{'Content-Type' : 'application/json'})
	res.end(JSON.stringify(object));
}

this.redirect = function(req,res,path){
	res.writeHead(302,{'location': path});
	res.end('redirect');
}
