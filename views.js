this.index = function(req,res,files){
	res.writeHead(200,{'Content-Type': 'text/html; charset=utf-8'});
	res.write('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">\n \n \
<html xmlns="http://www.w3.org/1999/xhtml">\n \
<head>\n \
<title>8080 - Dateien</title>\n \
<meta name="keywords" content="" />\n \
<meta name="description" content="" />\n \
<html><head><link rel="stylesheet" type="text/css" href="/style.css"></head><body>\
</head>\n \
<body>\n \
<div id="wrapper">\n \
<div id="header"> \n \
\n \
	<div id="logo">\n \
\n \
		<h1><a href="/">8080  </a></h1>\n \
		<h2> free and open otr-mirror system</h2>\n \
	</div>\n \
    <div id="logo2">\n \
</div>\n \
	<div id="menu">\n \
		<ul>\n \
			<li class="current_page_item"><a href="/">Dateien</a></li>\n \
\n \
			<li><a href="/faq">FAQ</a></li>\n \
			<li><a href="/imprint">Impressum</a></li>			\n \
			<li><a href="/queue" class="last">Tickets</a></li>\n \
		</ul>\n \
	</div>\n \
</div>\n \
\n \
\n \
<!-- start page -->\n \
<div id="page">\n \
	<!-- start content -->\n \
	<div id="content">\n \
')
			for(var i in files){
				var f = files[i];
				res.write('                <div class="post">\n'
                        +'<a href="/index/' +f.filename+ '"><h1 class="title">' + f.title + ' vom '
                        	+ f.start.getDate() + '.'
                        	+ f.start.getMonth() + '.'
                        	+ f.start.getFullYear() + ' um '
                        	+ f.start.getHours() + ':' 
                        	+ (f.start.getMinutes()<10?'0':'')+f.start.getMinutes()
                        	+ ' (' + f.station + ') '
                        	+ '<sup>'
                        		+ (f.avi ? 'DivX ' : '')
                        		+ (!f.otrkey ? 'unverschlüsselt ': '')
                        		+ (f.cut ? 'CUT ' : '')
                        		+ (f.mp4 ? 'MP4 ' : '')
                        		+ (f.hd ? 'HD ' : '')
                        		+ (f.hq ? 'HQ ' : '')
                        		+ (f.ac3 ? 'AC3 ' : '')
                        	+ '</sup></h1></a>\n \
                        <p class="meta">'+f.filename + '</p>\n \
                        <div class="entry"><p class="dl"><a href="/createTicketFor/'+f.filename+'">Datei herunterladen</a> (' + (f.filesize?(f.filesize/(1024*1024)).toFixed() + 'MB ~ ':'') + f.duration + ' Minuten)</p></div>\n \
                </div>\n \
');			}
res.end('\n \
	<div style="clear: both;">&nbsp;</div>\n \
</div>\n \
<!-- end page -->\n \
</div>\n \
<!-- start footer -->\n \
<div id="footer">\n \
	<p id="legal"> 8080 is open software. You are free to use and edit it as you like. Source can be found at github.com</p>\n \
</div>\n \
<!-- end footer -->\n \
</body>\n \
</html>\n \
');
}

this.queue = function(req,res,rows){
	res.writeHead(200,{'Content-Type': 'text/html; charset=utf-8'});
	res.write('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">\n \n \
<html xmlns="http://www.w3.org/1999/xhtml">\n \
<head>\n \
<title>8080 - Dateien</title>\n \
<meta name="keywords" content="" />\n \
<meta name="description" content="" />\n \
<html><head><link rel="stylesheet" type="text/css" href="/style.css"><script type="text/javascript" src="/jquery.js"></script><script type="text/javascript" src="/qrefresh.js"></script></head><body>\
</head>\n \
<body>\n \
<div id="wrapper">\n \
<div id="header"> \n \
\n \
	<div id="logo">\n \
\n \
		<h1><a href="/">8080  </a></h1>\n \
		<h2> free and open otr-mirror system</h2>\n \
	</div>\n \
    <div id="logo2">\n \
</div>\n \
	<div id="menu">\n \
		<ul>\n \
			<li><a href="/">Dateien</a></li>\n \
			<li><a href="/faq">FAQ</a></li>\n \
			<li><a href="/imprint">Impressum</a></li>\n \
			<li class="current_page_item"><a href="/queue" class="last">Tickets</a></li>\n \
		</ul>\n \
	</div>\n \
</div>\n \
\n \
\n \
<!-- start page -->\n \
<div id="page">\n \
	<!-- start content -->\n \
	<div id="content">\n \
	\n\
	<div class="post"><h1 class="title">Meine Tickets</h1>\
	<table id="qtable" width="100%">')
		if(rows && rows.length>0){
			res.write('<tr>\
				<th>Datei</th><th>Position</th><th>Download</th>\
			</tr>')
		
			for(var i in rows){
				var r = rows[i]
				res.write('<tr id="' + r.ticket_id + '"><td>' + r.filename + '</td><td class="position">' + r.position + '</td><td class="link"><a href="/download/' + r.ticket_id + '/' + r.hash + '/' + r.filename + '">' + (r.active?'high-speed':'low-speed') + '</a></td></tr>')
			}
		}
		else{
		res.write('<tr id = "empty">\
			<td colspan="3">Du hast zur Zeit keine Tickets</td>\
		</tr>')
		}
	res.end('</table>\
	</div>\
	</div>\n\
	<div style="clear: both;">&nbsp;</div>\n \
</div>\n \
<!-- end page -->\n \
</div>\n \
<!-- start footer -->\n \
<div id="footer">\n \
	<p id="legal"> 8080 is open software. You are free to use and edit it as you like. Source can be found at github.com</p>\n \
</div>\n \
<!-- end footer -->\n \
</body>\n \
</html>\n \
');
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
